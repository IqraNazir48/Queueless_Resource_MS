// backend/controllers/bookingController.js - FIXED
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Resource = require("../models/Resource");
const { getTimeSlotsForType } = require("../utils/slots");

const isValidDateString = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const getWeekStart = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
};

const getWeekEnd = (dateString) => {
    const weekStart = new Date(getWeekStart(dateString) + 'T00:00:00');
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd.toISOString().split('T')[0];
};

const isPastBooking = (date, slot) => {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + 
                     String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(now.getDate()).padStart(2, '0');
    
    if (date < todayStr) {
        return true;
    }
    
    if (date > todayStr) {
        return false;
    }
    
    if (date === todayStr) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        const slotStart = slot.split('-')[0];
        const [startHour, startMinute] = slotStart.split(':').map(Number);
        const slotStartMinutes = startHour * 60 + startMinute;
        
        if (currentTimeMinutes >= slotStartMinutes) {
            return true;
        }
    }
    
    return false;
};

exports.bookSlot = async (req, res) => {
    try {
        const { resourceId, date, slot } = req.body;

        if (!resourceId || !date || !slot) {
            return res.status(400).json({ message: "resourceId, date and slot are required" });
        }

        if (!isValidDateString(date)) {
            return res.status(400).json({ message: "date must be in YYYY-MM-DD format" });
        }

        // Get resource to check its type
        const resource = await Resource.findById(resourceId);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        // Get valid slots for this resource type
        const validSlots = await getTimeSlotsForType(resource.type);
        console.log('Valid slots for type', resource.type, ':', validSlots);
        console.log('Attempting to book slot:', slot);
        
        if (!validSlots.includes(slot)) {
            return res.status(400).json({ 
                message: "Invalid slot for this resource type. Please refresh the page and select an available slot." 
            });
        }

        if (isPastBooking(date, slot)) {
            return res.status(400).json({ 
                message: "Cannot book slots in the past. Please select a current or future time slot." 
            });
        }

        const now = new Date();
        const todayStr = now.getFullYear() + '-' + 
                         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(now.getDate()).padStart(2, '0');
        const isEarlyBooking = date > todayStr;

        const resourcesOfSameType = await Resource.find({ type: resource.type }).select('_id');
        const resourceIdsOfType = resourcesOfSameType.map(r => r._id);

        if (isEarlyBooking) {
            const totalEarlyBookings = await Booking.countDocuments({
                userId: req.user.id,
                resourceId: { $in: resourceIdsOfType },
                date: { $gt: todayStr },
                status: "active"
            });

            if (totalEarlyBookings >= 1) {
                return res.status(400).json({ 
                    message: `You already have 1 advance ${resource.type} booking. You can only make 1 early booking per resource type total.` 
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

        if (date >= todayStr) {
            const dailyBookingsForType = await Booking.countDocuments({
                userId: req.user.id,
                resourceId: { $in: resourceIdsOfType },
                date: date,
                status: "active"
            });

            if (dailyBookingsForType >= 2) {
                return res.status(400).json({ 
                    message: `You already have 2 ${resource.type} bookings for this day. Maximum 2 bookings per day per resource type allowed.` 
                });
            }
        }

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
                message: `You have reached the weekly limit for ${resource.type}. Maximum 4 bookings per week per resource type allowed.` 
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
                return res.status(409).json({ message: "This slot is already booked for this resource." });
            }
            throw err;
        }

        res.status(201).json({ message: "Slot booked successfully", booking });

    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ message: "Booking error", error: error.message });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

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

exports.getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id })
            .populate('resourceId', 'name type location')
            .sort({ date: -1, createdAt: -1 });
        
        const bookingsWithStatus = bookings.map(booking => {
            const bookingObj = booking.toObject();
            bookingObj.isPast = isPastBooking(booking.date, booking.slot);
            return bookingObj;
        });
        
        res.json(bookingsWithStatus);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bookings", error: error.message });
    }
};

exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('userId', 'name email')
            .populate('resourceId', 'name type location')
            .sort({ date: -1, createdAt: -1 });
        
        const bookingsWithStatus = bookings.map(booking => {
            const bookingObj = booking.toObject();
            bookingObj.isPast = isPastBooking(booking.date, booking.slot);
            return bookingObj;
        });
        
        res.json(bookingsWithStatus);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bookings", error: error.message });
    }
};