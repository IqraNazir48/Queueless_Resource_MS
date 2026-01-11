// backend/routes/settingsRoutes.js - UPDATED WITH CORRECT ROUTES
const express = require("express");
const router = express.Router();

const {
    getSettings,
    addResourceType,
    removeResourceType,
    addTimeSlot,
    removeTimeSlot,
    addTimeSlotToType,
    removeTimeSlotFromType,
    updateBookingLimits
} = require("../controllers/settingsController");

const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// GET all settings
router.get("/", verifyToken, getSettings);

// Resource type management
router.post("/resource-types", verifyToken, verifyAdmin, addResourceType);
router.delete("/resource-types", verifyToken, verifyAdmin, removeResourceType);

// NEW ROUTES - Per-type slot management (MUST COME BEFORE GENERIC ROUTES)
router.post("/resource-types/time-slots", verifyToken, verifyAdmin, addTimeSlotToType);
router.delete("/resource-types/time-slots", verifyToken, verifyAdmin, removeTimeSlotFromType);

// DEPRECATED ROUTES - keeping for backwards compatibility
router.post("/time-slots", verifyToken, verifyAdmin, addTimeSlot);
router.delete("/time-slots", verifyToken, verifyAdmin, removeTimeSlot);

// Booking limits
router.put("/booking-limits", verifyToken, verifyAdmin, updateBookingLimits);


module.exports = router;