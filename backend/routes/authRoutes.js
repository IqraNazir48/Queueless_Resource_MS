// backend/routes/authRoutes.js
const express = require("express");
const { 
    registerUser, 
    loginUser, 
    requestPasswordReset, 
    resetPassword,
    updateProfile,
    changePassword
} = require("../controllers/authController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

// Protected routes - Profile management
router.put("/update-profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);

// Set cookie endpoint for frontend (called after successful login)
router.post("/set-cookie", (req, res) => {
    try {
        const { token, user } = req.body;
        
        if (!token || !user) {
            return res.status(400).json({ message: "Token and user data required" });
        }
        
        // Set HTTP-only cookie for token (more secure)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 10 * 24 * 60 * 60 * 1000 // 10 days
        });
        
        // Set user info in non-httpOnly cookies (accessible by client JS)
        res.cookie('userName', user.name, { maxAge: 10 * 24 * 60 * 60 * 1000 });
        res.cookie('userEmail', user.email, { maxAge: 10 * 24 * 60 * 60 * 1000 });
        res.cookie('userRole', user.role, { maxAge: 10 * 24 * 60 * 60 * 1000 });
        res.cookie('userId', user.id, { maxAge: 10 * 24 * 60 * 60 * 1000 });
        
        res.json({ message: "Cookies set successfully" });
    } catch (error) {
        console.error("Set cookie error:", error);
        res.status(500).json({ message: "Error setting cookies", error: error.message });
    }
});

// Protected test endpoints
router.get("/me", verifyToken, (req, res) => {
    res.json({ message: "You are authenticated", user: req.user });
});

router.get("/admin-test", verifyToken, verifyAdmin, (req, res) => {
    res.json({ message: "Admin verified", user: req.user });
});

module.exports = router;