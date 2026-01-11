// backend/controllers/resourceController.js - UPDATED WITH CORRECT TIME LOGIC
const Booking = require("../models/Booking");
const Resource = require("../models/Resource");
const { getTimeSlotsForType } = require("../utils/slots");
const { createSystemNotification } = require("./notificationController");

exports.createResource = async (req, res) => {
    try {
        const { name, type, location, picture } = req.body;
        if (!name || !type || !location) {
            return res.status(400).json({ message: "name, type and location are required" });
        }
        const resource = await Resource.create({ 
            name, 
            type, 
            location, 
            picture: picture || "default-resource.png" 
        });
        
        // Create notification for residents
        await createSystemNotification({
            title: "New Resource Available!",
            message: `A new ${type.replace('_', ' ')} resource "${name}" has been added at ${location}. Book it now!`,
            type: "success",
            category: "resource",
            targetRole: "resident",
            relatedResource: resource._id,
            createdBy: req.user.id
        });
        
        res.status(201).json({ message: "Resource created", resource });
    } catch (error) {
        res.status(500).json({ message: "Error creating resource", error: error.message });
    }
};

exports.getResources = async (req, res) => {
    try {
        const filter = {};
        if (req.query.type) filter.type = req.query.type;
        const resources = await Resource.find(filter);
        res.json(resources);
    } catch (error) {
        res.status(500).json({ message: "Error fetching resources", error: error.message });
    }
};

exports.updateResource = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const resource = await Resource.findByIdAndUpdate(id, updates, { new: true });
        if (!resource) return res.status(404).json({ message: "Resource not found" });
        
        // Create notification for resource update
        await createSystemNotification({
            title: "Resource Updated",
            message: `Resource "${resource.name}" has been updated. Check the latest details.`,
            type: "info",
            category: "resource",
            targetRole: "resident",
            relatedResource: resource._id,
            createdBy: req.user.id
        });
        
        res.json({ message: "Resource updated", resource });
    } catch (error) {
        res.status(500).json({ message: "Error updating resource", error: error.message });
    }
};

exports.deleteResource = async (req, res) => {
    try {
        const { id } = req.params;
        const resource = await Resource.findByIdAndDelete(id);
        if (!resource) return res.status(404).json({ message: "Resource not found" });
        
        // Create notification for resource deletion
        await createSystemNotification({
            title: "Resource Removed",
            message: `The resource "${resource.name}" at ${resource.location} has been removed from the system.`,
            type: "warning",
            category: "resource",
            targetRole: "all",
            createdBy: req.user.id
        });
        
        res.json({ message: "Resource deleted", resource });
    } catch (error) {
        res.status(500).json({ message: "Error deleting resource", error: error.message });
    }
};

exports.updateResourceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!["available", "in-use", "out-of-service"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const resource = await Resource.findByIdAndUpdate(id, { status }, { new: true });
        if (!resource) return res.status(404).json({ message: "Resource not found" });
        
        // Create notification based on status
        let notifType = "info";
        let notifMessage = "";
        
        if (status === "out-of-service") {
            notifType = "danger";
            notifMessage = `Resource "${resource.name}" is now out of service. Please choose another resource.`;
        } else if (status === "available") {
            notifType = "success";
            notifMessage = `Good news! Resource "${resource.name}" is now available for booking.`;
        } else if (status === "in-use") {
            notifType = "warning";
            notifMessage = `Resource "${resource.name}" is currently in use.`;
        }
        
        if (notifMessage) {
            await createSystemNotification({
                title: "Resource Status Update",
                message: notifMessage,
                type: notifType,
                category: "resource",
                targetRole: "resident",
                relatedResource: resource._id,
                createdBy: req.user.id
            });
        }
        
        res.json({ message: "Status updated", resource });
    } catch (error) {
        res.status(500).json({ message: "Error updating status", error: error.message });
    }
};

exports.getAvailableSlots = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;

        if (!date) return res.status(400).json({ message: "Please provide date as query param, e.g. ?date=2025-01-02" });

        const resource = await Resource.findById(id);
        if (!resource) return res.status(404).json({ message: "Resource not found" });

        console.log('Getting slots for resource:', resource.name, 'type:', resource.type, 'date:', date);

        // Get all bookings for this resource on this date
        const bookings = await Booking.find({ 
            resourceId: id, 
            date, 
            status: "active"
        }).select("slot -_id");
        
        const bookedSlots = bookings.map(b => b.slot);
        console.log('Booked slots:', bookedSlots);

        // Get all possible slots for this resource type
        const allSlots = await getTimeSlotsForType(resource.type);
        console.log('All slots for type', resource.type + ':', allSlots);
        
        // Get current date and time
        const now = new Date();
        const todayStr = now.getFullYear() + '-' + 
                         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(now.getDate()).padStart(2, '0');
        
        const isToday = date === todayStr;
        
        // If it's today, get current time in minutes for comparison
        let currentTimeMinutes = 0;
        if (isToday) {
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            currentTimeMinutes = currentHour * 60 + currentMinute;
            console.log('Current time:', `${currentHour}:${String(currentMinute).padStart(2, '0')}`, '(', currentTimeMinutes, 'minutes)');
        }
        
        // Filter available slots
        const available = allSlots.filter(slot => {
            // Skip if slot is already booked
            if (bookedSlots.includes(slot)) {
                console.log(`Slot ${slot} is booked`);
                return false;
            }
            
            // If date is in the future, all slots are available
            if (date > todayStr) {
                return true;
            }
            
            // If date is in the past, no slots are available
            if (date < todayStr) {
                console.log(`Date ${date} is in the past`);
                return false;
            }
            
            // If it's today, check if slot start time hasn't passed
            if (isToday) {
                // Parse slot start time
                const slotStart = slot.split('-')[0]; // e.g., "11:00" from "11:00-12:00"
                const [startHour, startMinute] = slotStart.split(':').map(Number);
                const slotStartMinutes = startHour * 60 + startMinute;
                
                // Slot is available if its start time is still in the future
                if (currentTimeMinutes >= slotStartMinutes) {
                    console.log(`Slot ${slot} start time (${slotStartMinutes} min) has passed current time (${currentTimeMinutes} min)`);
                    return false;
                }
                
                console.log(`Slot ${slot} is available - starts at ${slotStartMinutes} min, current time is ${currentTimeMinutes} min`);
                return true;
            }
            
            return true;
        });

        console.log('Final available slots:', available);

        res.json({ 
            date, 
            resourceId: id, 
            resourceType: resource.type, 
            availableSlots: available,
            currentTime: isToday ? now.toISOString() : null
        });
    } catch (error) {
        console.error('Error in getAvailableSlots:', error);
        res.status(500).json({ message: "Error fetching available slots", error: error.message });
    }
};
