
const Notification = require("../models/notification");

// Get notifications for current user
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        const notifications = await Notification.find({
            $or: [
                { targetRole: "all" },
                { targetRole: userRole },
                { targetUser: userId }
            ],
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        })
        .populate('createdBy', 'name role')
        .populate('relatedResource', 'name type location')
        .sort({ createdAt: -1 })
        .limit(50);
        
        // Mark which ones are read by this user
        const notificationsWithReadStatus = notifications.map(notif => {
            const notifObj = notif.toObject();
            notifObj.isReadByUser = notif.isRead.some(read => read.userId.toString() === userId);
            return notifObj;
        });
        
        res.json(notificationsWithReadStatus);
    } catch (error) {
        res.status(500).json({ message: "Error fetching notifications", error: error.message });
    }
};

// Get ALL notifications (Admin only - for management page)
exports.getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find()
            .populate('createdBy', 'name role')
            .populate('relatedResource', 'name type location')
            .sort({ createdAt: -1 });
        
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Error fetching notifications", error: error.message });
    }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        const notifications = await Notification.find({
            $or: [
                { targetRole: "all" },
                { targetRole: userRole },
                { targetUser: userId }
            ],
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        });
        
        const unreadCount = notifications.filter(notif => 
            !notif.isRead.some(read => read.userId.toString() === userId)
        ).length;
        
        res.json({ unreadCount });
    } catch (error) {
        res.status(500).json({ message: "Error fetching unread count", error: error.message });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        
        // Check if already read by this user
        const alreadyRead = notification.isRead.some(read => read.userId.toString() === userId);
        
        if (!alreadyRead) {
            notification.isRead.push({ userId, readAt: new Date() });
            await notification.save();
        }
        
        res.json({ message: "Notification marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Error marking notification", error: error.message });
    }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        const notifications = await Notification.find({
            $or: [
                { targetRole: "all" },
                { targetRole: userRole },
                { targetUser: userId }
            ],
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        });
        
        for (const notif of notifications) {
            const alreadyRead = notif.isRead.some(read => read.userId.toString() === userId);
            if (!alreadyRead) {
                notif.isRead.push({ userId, readAt: new Date() });
                await notif.save();
            }
        }
        
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Error marking all notifications", error: error.message });
    }
};

// Create notification (Admin only)
exports.createNotification = async (req, res) => {
    try {
        const { title, message, type, category, targetRole, expiresAt } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ message: "Title and message are required" });
        }
        
        const notification = await Notification.create({
            title,
            message,
            type: type || "info",
            category: category || "announcement",
            targetRole: targetRole || "all",
            createdBy: req.user.id,
            expiresAt: expiresAt || null
        });
        
        res.status(201).json({ message: "Notification created", notification });
    } catch (error) {
        res.status(500).json({ message: "Error creating notification", error: error.message });
    }
};

// Delete notification (Admin only)
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        
        const notification = await Notification.findByIdAndDelete(id);
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        
        res.json({ message: "Notification deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting notification", error: error.message });
    }
};

// Helper function to create system notifications (used by other controllers)
exports.createSystemNotification = async (data) => {
    try {
        const notification = await Notification.create({
            title: data.title,
            message: data.message,
            type: data.type || "info",
            category: data.category || "system",
            targetRole: data.targetRole || "all",
            targetUser: data.targetUser || null,
            relatedResource: data.relatedResource || null,
            createdBy: data.createdBy,
            expiresAt: data.expiresAt || null
        });
        return notification;
    } catch (error) {
        console.error("Error creating system notification:", error);
        return null;
    }
};