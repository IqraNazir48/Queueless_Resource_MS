// backend/controllers/bookingController.js - FINAL UPDATED
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Resource = require("../models/Resource");
const { getTimeSlotsForType } = require("../utils/slots");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

// Set your local timezone here
const LOCAL_TIMEZONE = "Asia/Karachi";

const isValidDateString = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const getWeekStart = (dateString) => {
    const date = dayjs.tz(dateString, LOCAL_TIMEZONE);
    const monday = date.startOf("week").add(1, "day"); // week starts Monday
    return monday.format("YYYY-MM-DD");
};

const getWeekEnd = (dateString) => {
    const weekStart = dayjs.tz(getWeekStart(dateString), LOCAL_TIMEZONE);
    const weekEnd = weekStart.add(6, "day");
    return weekEnd.format("YYYY-MM-DD");
};

const isPastBooking = (date, slot) => {
    // Convert date and slot to dayjs object in local timezone
    const now = dayjs().tz(LOCAL_TIMEZONE);

    const [hour, minute] = slot.split("-")[0].split(":").map(Number);
    const slotTime = dayjs.tz(date, LOCAL_TIMEZONE).hour(hour).minute(minute).second(0);

    return now.isAfter(slotTime);
};

// BOOK SLOT
exports.bookSlot = async (req, res) => {
    try {
        const { resourceId, date, slot } = req.body;

        if (!resourceId || !date || !slot) {
            return res.status(400).json({ message: "resourceId, date and slot are required" });
        }

        if (!isValidDateString(date)) {
            return res.status(400).json({ message: "date must be in YYYY-MM-DD format" });
        }

        const resource = await Resource.findById(resourceId);
        if (!resource) return res.status(404).json({ message: "Resource not found" });

        const validSlots = await getTimeSlotsForType(resource.type);

        if (!validSlots.includes(slot)) {
            return res.status(400).json({ 
                message: "Invalid slot for this resource type. Please refresh and select an available slot." 
            });
        }

        // Check if slot is in the past
        if (isPastBooking(date, slot)) {
            return res.status(400).json({ 
                message: "Cannot book slots in the past. Please select a current or future slot." 
            });
        }

        const resourcesOfSameType = await Resource.find({ type: resource.type }).select("_id");
        const resourceIdsOfType = resourcesOfSameType.map(r => r._id);

        const now = dayjs().tz(LOCAL_TIMEZONE);
        const todayStr = now.format("YYYY-MM-DD");
        const isEarlyBooking = dayjs(date).isAfter(todayStr);

        if (isEarlyBooking) {
            const totalEarlyBookings = await Booking.countDocuments({
                userId: req.user.id,
                resourceId: { $in: resourceIdsOfType },
                date: { $gt: todayStr },
                status: "active"
            });

            if (totalEarlyBookings >= 1) {
                return res.status(400).json({ 
                    message: `You already have 1 advance ${resource.type} booking. Maximum 1 early booking per resource type.` 
                });
            }
        }

        const slotConflict = await Booking.findOne({
            userId: req.user.id,
            date: date,
            slot: slot,
            status: "active"
        });

        if (slotConflict) {
            return res.status(400).json({ 
                message: "You already have a booking in this time slot. Only 1 resource per time slot is allowed." 
            });
        }

        // Daily booking limit
        const dailyBookingsForType = await Booking.countDocuments({
            userId: req.user.id,
            resourceId: { $in: resourceIdsOfType },
            date: date,
            status: "active"
        });

        if (dailyBookingsForType >= 2) {
            return res.status(400).json({ 
                message: `You already have 2 ${resource.type} bookings for this day. Max 2 per day allowed.` 
            });
        }

        // Weekly booking limit
        const weekStart = getWeekStart(date);
        const weekEnd = getWeekEnd(date);

        const weeklyBookingsForType = await Booking.countDocuments({
            userId: req.user.id,
            resourceId: { $in: resourceIdsOfType },
            date: { $gte: weekStart, $lte: weekEnd },
            status: "active"
        });

        if (weeklyBookingsForType >= 4) {
            return res.status(400).json({ 
                message: `Reached weekly limit for ${resource.type}. Max 4 per week allowed.` 
            });
        }

        const booking = new Booking({
            userId: req.user.id,
            resourceId,
            date,
            slot,
            status: "active"
        });

        try {
            await booking.save();
        } catch (err) {
            if (err.code === 11000) {
                return res.status(409).json({ message: "This slot is already booked." });
            }
            throw err;
        }

        res.status(201).json({ message: "Slot booked successfully", booking });

    } catch (error) {
        console.error("Booking error:", error);
        res.status(500).json({ message: "Booking error", error: error.message });
    }
};

// CANCEL BOOKING
exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (booking.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not allowed" });
        }

        if (isPastBooking(booking.date, booking.slot)) {
            return res.status(400).json({ message: "Cannot cancel past bookings" });
        }

        if (booking.status === "cancelled") {
            return res.status(400).json({ message: "Booking is already cancelled" });
        }

        booking.status = "cancelled";
        await booking.save();
        res.json({ message: "Booking cancelled", booking });

    } catch (error) {
        res.status(500).json({ message: "Error cancelling", error: error.message });
    }
};

// ADMIN CANCEL
exports.adminCancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (isPastBooking(booking.date, booking.slot)) {
            return res.status(400).json({ message: "Cannot cancel past bookings" });
        }

        if (booking.status === "cancelled") {
            return res.status(400).json({ message: "Booking is already cancelled" });
        }

        booking.status = "cancelled";
        await booking.save();
        res.json({ message: "Booking cancelled by admin", booking });

    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
};

// GET USER BOOKINGS
exports.getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id })
            .populate("resourceId", "name type location")
            .sort({ date: -1, createdAt: -1 });

        const bookingsWithStatus = bookings.map(b => {
            const obj = b.toObject();
            obj.isPast = isPastBooking(obj.date, obj.slot);
            return obj;
        });

        res.json(bookingsWithStatus);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bookings", error: error.message });
    }
};

// GET ALL BOOKINGS
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate("userId", "name email")
            .populate("resourceId", "name type location")
            .sort({ date: -1, createdAt: -1 });

        const bookingsWithStatus = bookings.map(b => {
            const obj = b.toObject();
            obj.isPast = isPastBooking(obj.date, obj.slot);
            return obj;
        });

        res.json(bookingsWithStatus);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bookings", error: error.message });
    }
};
