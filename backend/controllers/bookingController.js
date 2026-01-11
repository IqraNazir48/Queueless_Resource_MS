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
    const localOffset = now.getTimezoneOffset() * 60 * 1000;
    const localNow = new Date(now.getTime() - localOffset);
    const todayStr = localNow.toISOString().split('T')[0];

    if (date < todayStr) return true;
    if (date > todayStr) return false;

    const [startHour, startMinute] = slot.split('-')[0].split(':').map(Number);
    const slotMinutes = startHour * 60 + startMinute;
    const currentMinutes = localNow.getHours() * 60 + localNow.getMinutes();

    return currentMinutes >= slotMinutes;
};

exports.getAvailableSlots = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;

        const resource = await Resource.findById(id);
        if (!resource) return res.status(404).json({ message: "Resource not found" });

        let allSlots = await getTimeSlotsForType(resource.type);

        const now = new Date();
        const localOffset = now.getTimezoneOffset() * 60 * 1000;
        const localNow = new Date(now.getTime() - localOffset);
        const todayStr = localNow.toISOString().split('T')[0];

        if (date === todayStr) {
            const currentMinutes = localNow.getHours() * 60 + localNow.getMinutes();
            allSlots = allSlots.filter(slot => {
                const [hour, minute] = slot.split('-')[0].split(':').map(Number);
                return hour * 60 + minute > currentMinutes;
            });
        }

        res.json({ availableSlots: allSlots });
    } catch (error) {
        console.error("Error fetching slots:", error);
        res.status(500).json({ message: "Error fetching slots", error: error.message });
    }
};

exports.bookSlot = async (req, res) => {
    try {
        const { resourceId, date, slot } = req.body;
        if (!resourceId || !date || !slot) return res.status(400).json({ message: "resourceId, date and slot are required" });
        if (!isValidDateString(date)) return res.status(400).json({ message: "date must be in YYYY-MM-DD format" });

        const resource = await Resource.findById(resourceId);
        if (!resource) return res.status(404).json({ message: "Resource not found" });

        const validSlots = await getTimeSlotsForType(resource.type);
        if (!validSlots.includes(slot)) return res.status(400).json({ message: "Invalid slot for this resource type" });

        if (isPastBooking(date, slot)) return res.status(400).json({ message: "Cannot book slots in the past" });

        const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset()*60000).toISOString().split('T')[0];
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
            if (totalEarlyBookings >= 1) return res.status(400).json({ message: `You can only make 1 early booking per resource type` });
        }

        const slotConflict = await Booking.findOne({ userId: req.user.id, date, slot, status: "active" });
        if (slotConflict) return res.status(400).json({ message: "You already have a booking in this slot" });

        if (date >= todayStr) {
            const dailyBookingsForType = await Booking.countDocuments({ userId: req.user.id, resourceId: { $in: resourceIdsOfType }, date, status: "active" });
            if (dailyBookingsForType >= 2) return res.status(400).json({ message: "Maximum 2 bookings per day per resource type allowed" });
        }

        const weekStart = getWeekStart(date);
        const weekEnd = getWeekEnd(date);
        const weeklyBookingsForType = await Booking.countDocuments({ userId: req.user.id, resourceId: { $in: resourceIdsOfType }, date: { $gte: weekStart, $lte: weekEnd }, status: "active" });
        if (weeklyBookingsForType >= 4) return res.status(400).json({ message: "Maximum 4 bookings per week per resource type allowed" });

        const booking = new Booking({ userId: req.user.id, resourceId, date, slot, status: "active" });
        try { await booking.save(); } 
        catch (err) { if (err.code === 11000) return res.status(409).json({ message: "This slot is already booked" }); throw err; }

        res.status(201).json({ message: "Slot booked successfully", booking });

    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ message: "Booking error", error: error.message });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        if (booking.userId.toString() !== req.user.id) return res.status(403).json({ message: "Not allowed" });
        if (isPastBooking(booking.date, booking.slot)) return res.status(400).json({ message: "Cannot cancel past bookings" });
        if (booking.status === "cancelled") return res.status(400).json({ message: "Booking is already cancelled" });

        booking.status = "cancelled";
        await booking.save();
        res.json({ message: "Booking cancelled", booking });
    } catch (error) {
        res.status(500).json({ message: "Error cancelling", error: error.message });
    }
};

exports.getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id }).populate('resourceId', 'name type location').sort({ date: -1, createdAt: -1 });
        const bookingsWithStatus = bookings.map(b => { const obj = b.toObject(); obj.isPast = isPastBooking(b.date, b.slot); return obj; });
        res.json(bookingsWithStatus);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bookings", error: error.message });
    }
};

exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find().populate('userId', 'name email').populate('resourceId', 'name type location').sort({ date: -1, createdAt: -1 });
        const bookingsWithStatus = bookings.map(b => { const obj = b.toObject(); obj.isPast = isPastBooking(b.date, b.slot); return obj; });
        res.json(bookingsWithStatus);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bookings", error: error.message });
    }
};
