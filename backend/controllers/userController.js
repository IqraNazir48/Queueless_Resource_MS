const User = require("../models/User");

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });
        
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user", error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting user", error: error.message });
    }
};

exports.getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const adminCount = await User.countDocuments({ role: 'admin' });
        const residentCount = await User.countDocuments({ role: 'resident' });
        
        res.json({
            totalUsers,
            adminCount,
            residentCount
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching statistics", error: error.message });
    }
};