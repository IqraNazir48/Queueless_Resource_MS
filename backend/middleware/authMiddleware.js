const jwt = require("jsonwebtoken");

// Verify token
exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.userId,
            role: decoded.role
        };

        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};

// Admin-only middleware
exports.verifyAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access only" });
    }
    next();
};
