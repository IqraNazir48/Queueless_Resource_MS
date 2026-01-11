const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE;

const generateToken = (user) => {
    return jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "10d"}
    );
};

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: "Invalid email format" };
    }
    
    const validDomains = ['gmail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (!domain) {
        return { valid: false, message: "Invalid email format" };
    }
    
    const isValid = validDomains.includes(domain);
    
    if (!isValid) {
        return { 
            valid: false, 
            message: "Only Gmail addresses are allowed for security reasons" 
        };
    }
    
    return { valid: true };
};

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role, adminCode, profilePicture } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }

        const emailValidation = isValidEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({ message: emailValidation.message });
        }

        if (role === "admin") {
            if (!adminCode || adminCode !== ADMIN_SECRET_CODE) {
                return res.status(403).json({ 
                    message: "Invalid admin code" 
                });
            }
        }

        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const saltRounds = Number(process.env.BCRYPT_SALT) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role || "resident",
            profilePicture: profilePicture || "default-avatar.png"
        });

        const token = generateToken(newUser);

        res.status(201).json({
            message: "Registration successful",
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                profilePicture: newUser.profilePicture
            }
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(400).json({ message: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

        const token = generateToken(user);

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const createEmailTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const emailValidation = isValidEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({ message: emailValidation.message });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.json({ message: "If that email exists, a reset code has been sent" });
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const resetCodeHash = crypto.createHash('sha256').update(resetCode).digest('hex');
        
        user.resetPasswordCode = resetCodeHash;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        const transporter = createEmailTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'QueueLess - Password Reset Code',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
                        <h2 style="color: #3b82f6;">QueueLess Password Reset</h2>
                        <p>You requested to reset your password. Use the code below to reset it:</p>
                        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #3b82f6; letter-spacing: 5px; margin: 0;">${resetCode}</h1>
                        </div>
                        <p>This code will expire in 10 minutes.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 12px;">QueueLess - Smart Resource Booking</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        res.json({ 
            message: "Reset code sent to your email"
        });

    } catch (error) {
        console.error("Reset request error:", error);
        res.status(500).json({ message: "Failed to send reset email", error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;

        if (!email || !resetCode || !newPassword) {
            return res.status(400).json({ message: "Email, reset code and new password are required" });
        }

        const user = await User.findOne({ 
            email: email.toLowerCase(),
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset code" });
        }

        const resetCodeHash = crypto.createHash('sha256').update(resetCode).digest('hex');
        if (user.resetPasswordCode !== resetCodeHash) {
            return res.status(400).json({ message: "Invalid reset code" });
        }

        const saltRounds = Number(process.env.BCRYPT_SALT) || 10;
        user.password = await bcrypt.hash(newPassword, saltRounds);
        user.resetPasswordCode = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: "Password reset successful. Please login with your new password." });

    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, profilePicture } = req.body;
        const userId = req.user.id;

        if (!name && !profilePicture) {
            return res.status(400).json({ message: "Name or profile picture is required" });
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (profilePicture) updateData.profilePicture = profilePicture;

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ 
            message: "Profile updated successfully", 
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture
            }
        });

    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters long" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        const saltRounds = Number(process.env.BCRYPT_SALT) || 10;
        user.password = await bcrypt.hash(newPassword, saltRounds);
        await user.save();

        res.json({ message: "Password changed successfully" });

    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};