// backend/models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["info", "success", "warning", "danger"],
        default: "info"
    },
    category: {
        type: String,
        enum: ["resource", "booking", "system", "announcement"],
        default: "system"
    },
    targetRole: {
        type: String,
        enum: ["all", "resident", "admin"],
        default: "all"
    },
    targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    relatedResource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resource",
        default: null
    },
    isRead: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    expiresAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Index for efficient queries
notificationSchema.index({ targetRole: 1, createdAt: -1 });
notificationSchema.index({ targetUser: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Notification", notificationSchema);