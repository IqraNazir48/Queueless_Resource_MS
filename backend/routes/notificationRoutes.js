// backend/routes/notificationRoutes.js
const express = require("express");
const router = express.Router();

const {
    getNotifications,
    getAllNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification
} = require("../controllers/notificationController");

const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// Get all notifications for current user
router.get("/", verifyToken, getNotifications);

// Get ALL notifications (Admin only - for management page)
router.get("/all", verifyToken, verifyAdmin, getAllNotifications);

// Get unread count
router.get("/unread-count", verifyToken, getUnreadCount);

// Mark notification as read
router.put("/:id/read", verifyToken, markAsRead);

// Mark all as read
router.put("/mark-all-read", verifyToken, markAllAsRead);

// Create notification (Admin only)
router.post("/", verifyToken, verifyAdmin, createNotification);

// Delete notification (Admin only)
router.delete("/:id", verifyToken, verifyAdmin, deleteNotification);

module.exports = router;