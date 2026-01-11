const express = require("express");
const router = express.Router();

const {
    bookSlot,
    cancelBooking,
    adminCancelBooking,
    getUserBookings,
    getAllBookings
} = require("../controllers/bookingController");

const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// Book a Slot
router.post("/slot", verifyToken, bookSlot);

// Get My Bookings
router.get("/my", verifyToken, getUserBookings);

// Get All Bookings (Admin)
router.get("/", verifyToken, verifyAdmin, getAllBookings);

// Cancel My Booking
router.put("/cancel/:id", verifyToken, cancelBooking);

// Admin Cancel
router.put("/admin/cancel/:id", verifyToken, verifyAdmin, adminCancelBooking);

module.exports = router;
