const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resource",
        required: true
    },
    date: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d{4}-\d{2}-\d{2}$/.test(v);
            },
            message: props => `${props.value} is not a valid date (expected YYYY-MM-DD)`
        }
    },
    slot: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["active", "cancelled"],
        default: "active"
    }
}, { timestamps: true });

// Prevent double booking of ACTIVE slots for the same resource
bookingSchema.index(
    { resourceId: 1, date: 1, slot: 1 },
    { unique: true, partialFilterExpression: { status: "active" } }
);

// Prevent user from booking multiple resources in the same time slot
bookingSchema.index(
    { userId: 1, date: 1, slot: 1 },
    { unique: true, partialFilterExpression: { status: "active" } }
);

bookingSchema.index({ userId: 1, resourceId: 1, date: 1, status: 1 });

// Export with check to prevent overwrite error
module.exports = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);