// backend/routes/frontendRoutes.js - UPDATED WITH NOTIFICATIONS ROUTE
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const getUserFromRequest = (req) => {
    const token = req.cookies?.token;
    
    if (!token) {
        return null;
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return {
            id: decoded.userId,
            role: decoded.role,
            name: req.cookies?.userName || 'User',
            email: req.cookies?.userEmail || ''
        };
    } catch (error) {
        return null;
    }
};

router.get("/", (req, res) => {
    const user = getUserFromRequest(req);
    res.render("index", { page: 'home', user });
});

router.get("/login", (req, res) => {
    const user = getUserFromRequest(req);
    if (user) {
        return res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    }
    res.render("auth/login", { page: 'login', user: null, success: '', error: '' });
});

router.get("/register", (req, res) => {
    const user = getUserFromRequest(req);
    if (user) {
        return res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    }
    res.render("auth/register", { page: 'register', user: null });
});

router.get("/forgot-password", (req, res) => {
    const user = getUserFromRequest(req);
    if (user) {
        return res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    }
    res.render("auth/forgot-password", { page: 'forgot-password', user: null });
});

router.get("/reset-password", (req, res) => {
    const user = getUserFromRequest(req);
    if (user) {
        return res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    }
    res.render("auth/reset-password", { page: 'reset-password', user: null });
});

router.get("/logout", (req, res) => {
    res.clearCookie('token');
    res.clearCookie('userName');
    res.clearCookie('userEmail');
    res.clearCookie('userRole');
    res.clearCookie('userId');
    res.redirect("/");
});

router.get("/dashboard", (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
        return res.redirect("/login");
    }
    if (user.role === "admin") {
        return res.redirect("/admin/dashboard");
    }
    res.render("resident/dashboard", { page: 'dashboard', user, success: '', error: '' });
});

router.get("/book-resource", (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
        return res.redirect("/login");
    }
    res.render("resident/book-resource", { page: 'book-resource', user });
});

router.get("/my-bookings", (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
        return res.redirect("/login");
    }
    res.render("resident/my-bookings", { page: 'my-bookings', user });
});

router.get("/profile", (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
        return res.redirect("/login");
    }
    res.render("resident/profile", { page: 'profile', user });
});

router.get("/admin/dashboard", (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
        return res.redirect("/login");
    }
    if (user.role !== "admin") {
        return res.redirect("/dashboard");
    }
    res.render("admin/dashboard", { page: 'admin-dashboard', user });
});

router.get("/admin/resources", (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
        return res.redirect("/login");
    }
    if (user.role !== "admin") {
        return res.redirect("/dashboard");
    }
    res.render("admin/manage-resources", { page: 'admin-resources', user });
});

router.get("/admin/bookings", (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
        return res.redirect("/login");
    }
    if (user.role !== "admin") {
        return res.redirect("/dashboard");
    }
    res.render("admin/all-bookings", { page: 'admin-bookings', user });
});

router.get("/admin/users", (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
        return res.redirect("/login");
    }
    if (user.role !== "admin") {
        return res.redirect("/dashboard");
    }
    res.render("admin/manage-users", { page: 'admin-users', user });
});

router.get("/admin/settings", (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
        return res.redirect("/login");
    }
    if (user.role !== "admin") {
        return res.redirect("/dashboard");
    }
    res.render("admin/settings", { page: 'admin-settings', user });
});

router.get("/admin/notifications", (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
        return res.redirect("/login");
    }
    if (user.role !== "admin") {
        return res.redirect("/dashboard");
    }
    res.render("admin/notifications", { page: 'admin-notifications', user });
});

router.get("/admin/profile", (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
        return res.redirect("/login");
    }
    if (user.role !== "admin") {
        return res.redirect("/dashboard");
    }
    res.render("admin/profile", { page: 'admin-profile', user });
});

module.exports = router;