
const Settings = require("../models/Settings");

exports.getSettings = async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: "Error fetching settings", error: error.message });
    }
};

exports.addResourceType = async (req, res) => {
    try {
        const { value, label, icon } = req.body;
        
        if (!value || !label) {
            return res.status(400).json({ message: "value and label are required" });
        }
        
        const settings = await Settings.getSettings();
        
        const exists = settings.resourceTypes.find(rt => rt.value === value);
        if (exists) {
            return res.status(400).json({ message: "Resource type already exists" });
        }
        
        settings.resourceTypes.push({
            value: value.toLowerCase().replace(/\s+/g, '_'),
            label,
            icon: icon || "grid",
            timeSlots: [] // empty initially
        });
        
        await settings.save();
        
        res.json({ message: "Resource type added", settings });
    } catch (error) {
        res.status(500).json({ message: "Error adding resource type", error: error.message });
    }
};

exports.removeResourceType = async (req, res) => {
    try {
        const { value } = req.body;
        
        const settings = await Settings.getSettings();
        settings.resourceTypes = settings.resourceTypes.filter(rt => rt.value !== value);
        await settings.save();
        
        res.json({ message: "Resource type removed", settings });
    } catch (error) {
        res.status(500).json({ message: "Error removing resource type", error: error.message });
    }
};

// NEW: Add time slot to specific resource type
exports.addTimeSlotToType = async (req, res) => {
    try {
        const { resourceType, slot } = req.body;
        
        console.log('Received request:', { resourceType, slot }); // Debug log
        
        if (!resourceType || !slot) {
            return res.status(400).json({ message: "resourceType and slot are required" });
        }
        
        const slotRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!slotRegex.test(slot)) {
            return res.status(400).json({ message: "Invalid slot format. Use HH:MM-HH:MM" });
        }
        
        const settings = await Settings.getSettings();
        
        if (!settings || !settings.resourceTypes) {
            return res.status(500).json({ message: "Settings not properly initialized" });
        }
        
        const typeIndex = settings.resourceTypes.findIndex(rt => rt.value === resourceType);
        
        if (typeIndex === -1) {
            return res.status(404).json({ message: "Resource type not found: " + resourceType });
        }
        
        // Initialize timeSlots array if it doesn't exist
        if (!settings.resourceTypes[typeIndex].timeSlots) {
            settings.resourceTypes[typeIndex].timeSlots = [];
        }
        
        if (settings.resourceTypes[typeIndex].timeSlots.includes(slot)) {
            return res.status(400).json({ message: "Time slot already exists for this resource type" });
        }
        
        // Check for overlapping slots
        const [newStart, newEnd] = slot.split('-');
        const newStartMinutes = timeToMinutes(newStart);
        const newEndMinutes = timeToMinutes(newEnd);
        
        for (const existingSlot of settings.resourceTypes[typeIndex].timeSlots) {
            const [existStart, existEnd] = existingSlot.split('-');
            const existStartMinutes = timeToMinutes(existStart);
            const existEndMinutes = timeToMinutes(existEnd);
            
            // Check if slots overlap
            if (
                (newStartMinutes >= existStartMinutes && newStartMinutes < existEndMinutes) ||
                (newEndMinutes > existStartMinutes && newEndMinutes <= existEndMinutes) ||
                (newStartMinutes <= existStartMinutes && newEndMinutes >= existEndMinutes)
            ) {
                return res.status(400).json({ 
                    message: `Time slot conflicts with existing slot: ${existingSlot}` 
                });
            }
        }
        
        settings.resourceTypes[typeIndex].timeSlots.push(slot);
        settings.resourceTypes[typeIndex].timeSlots.sort();
        
        await settings.save();
        
        // Refresh settings from DB
        const updatedSettings = await Settings.getSettings();
        
        return res.status(200).json({ message: "Time slot added", settings: updatedSettings });
    } catch (error) {
        console.error('Error in addTimeSlotToType:', error);
        return res.status(500).json({ message: "Error adding time slot", error: error.message });
    }
};

// Helper function to convert time to minutes
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// NEW: Remove time slot from specific resource type
exports.removeTimeSlotFromType = async (req, res) => {
    try {
        const { resourceType, slot } = req.body;
        
        console.log('Remove request:', { resourceType, slot }); // Debug log
        
        if (!resourceType || !slot) {
            return res.status(400).json({ message: "resourceType and slot are required" });
        }
        
        const settings = await Settings.getSettings();
        
        if (!settings || !settings.resourceTypes) {
            return res.status(500).json({ message: "Settings not properly initialized" });
        }
        
        const typeIndex = settings.resourceTypes.findIndex(rt => rt.value === resourceType);
        
        if (typeIndex === -1) {
            return res.status(404).json({ message: "Resource type not found: " + resourceType });
        }
        
        // Initialize timeSlots array if it doesn't exist
        if (!settings.resourceTypes[typeIndex].timeSlots) {
            settings.resourceTypes[typeIndex].timeSlots = [];
        }
        
        settings.resourceTypes[typeIndex].timeSlots = 
            settings.resourceTypes[typeIndex].timeSlots.filter(s => s !== slot);
        
        await settings.save();
        
        // Refresh settings from DB
        const updatedSettings = await Settings.getSettings();
        
        res.json({ message: "Time slot removed", settings: updatedSettings });
    } catch (error) {
        console.error('Error in removeTimeSlotFromType:', error);
        res.status(500).json({ message: "Error removing time slot", error: error.message });
    }
};

// DEPRECATED - keeping for backwards compatibility
exports.addTimeSlot = async (req, res) => {
    try {
        const { slot } = req.body;
        
        if (!slot) {
            return res.status(400).json({ message: "slot is required" });
        }
        
        const slotRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!slotRegex.test(slot)) {
            return res.status(400).json({ message: "Invalid slot format. Use HH:MM-HH:MM" });
        }
        
        const settings = await Settings.getSettings();
        
        if (settings.timeSlots.includes(slot)) {
            return res.status(400).json({ message: "Time slot already exists" });
        }
        
        settings.timeSlots.push(slot);
        settings.timeSlots.sort();
        await settings.save();
        
        res.json({ message: "Time slot added", settings });
    } catch (error) {
        res.status(500).json({ message: "Error adding time slot", error: error.message });
    }
};

// DEPRECATED
exports.removeTimeSlot = async (req, res) => {
    try {
        const { slot } = req.body;
        
        const settings = await Settings.getSettings();
        settings.timeSlots = settings.timeSlots.filter(s => s !== slot);
        await settings.save();
        
        res.json({ message: "Time slot removed", settings });
    } catch (error) {
        res.status(500).json({ message: "Error removing time slot", error: error.message });
    }
};

exports.updateBookingLimits = async (req, res) => {
    try {
        const { dailyLimit, weeklyLimit, advanceBookingLimit } = req.body;
        
        const settings = await Settings.getSettings();
        
        if (dailyLimit !== undefined) settings.bookingLimits.dailyLimit = dailyLimit;
        if (weeklyLimit !== undefined) settings.bookingLimits.weeklyLimit = weeklyLimit;
        if (advanceBookingLimit !== undefined) settings.bookingLimits.advanceBookingLimit = advanceBookingLimit;
        
        await settings.save();
        
        res.json({ message: "Booking limits updated", settings });
    } catch (error) {
        res.status(500).json({ message: "Error updating booking limits", error: error.message });
    }
};