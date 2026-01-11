const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["laundry", "study_room", "sports"],
        required: true
    },
    status: {
        type: String,
        enum: ["available", "in-use", "out-of-service"],
        default: "available"
    },
    location: {
        type: String,
        required: true
    },
    picture: {
        type: String,
        default: "default-resource.png"
    }
}, { timestamps: true });

module.exports = mongoose.model("Resource", resourceSchema);