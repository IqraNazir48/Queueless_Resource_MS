const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["resident", "admin"],
        default: "resident"
    },
    profilePicture: {
        type: String,
        default: "default-avatar.png"
    },
    resetPasswordCode: String,
    resetPasswordExpires: Date
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);