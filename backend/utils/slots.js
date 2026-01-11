const Settings = require("../models/Settings");

// Get time slots for a specific resource type
async function getTimeSlotsForType(resourceType) {
    try {
        console.log('getTimeSlotsForType called with:', resourceType);
        
        const settings = await Settings.getSettings();
        console.log('Settings loaded:', settings ? 'Yes' : 'No');
        
        if (!settings || !settings.resourceTypes) {
            console.log('No settings or resourceTypes found, using fallback');
            return getFallbackSlots();
        }
        
        const type = settings.resourceTypes.find(rt => rt.value === resourceType);
        console.log('Found resource type:', type ? type.label : 'Not found');
        
        if (type && type.timeSlots && Array.isArray(type.timeSlots) && type.timeSlots.length > 0) {
            console.log('Returning timeSlots:', type.timeSlots);
            return type.timeSlots;
        }
        
        console.log('No timeSlots for this type, using fallback');
        return getFallbackSlots();
    } catch (error) {
        console.error('Error in getTimeSlotsForType:', error);
        return getFallbackSlots();
    }
}

function getFallbackSlots() {
    return [
        "08:00-09:00",
        "09:00-10:00",
        "10:00-11:00",
        "11:00-12:00",
        "13:00-14:00",
        "14:00-15:00",
        "15:00-16:00",
        "16:00-17:00"
    ];
}

// DEPRECATED - keeping for backwards compatibility
async function getTimeSlots() {
    try {
        const settings = await Settings.getSettings();
        
        // Try to get from deprecated timeSlots field
        if (settings.timeSlots && settings.timeSlots.length > 0) {
            return settings.timeSlots;
        }
        
        // Fallback to getting all unique slots from all types
        const allSlots = new Set();
        if (settings.resourceTypes && Array.isArray(settings.resourceTypes)) {
            settings.resourceTypes.forEach(rt => {
                if (rt.timeSlots && Array.isArray(rt.timeSlots)) {
                    rt.timeSlots.forEach(slot => allSlots.add(slot));
                }
            });
        }
        
        if (allSlots.size > 0) {
            return Array.from(allSlots).sort();
        }
        
        // Final fallback
        return getFallbackSlots();
    } catch (error) {
        console.error('Error in getTimeSlots:', error);
        return getFallbackSlots();
    }
}

module.exports = { getTimeSlots, getTimeSlotsForType };