
const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
    settingsId: {
        type: String,
        default: "system_settings",
        unique: true
    },
    
    resourceTypes: [{
        value: {
            type: String,
            required: true
        },
        label: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            default: "grid"
        },
        timeSlots: [{
            type: String,
            required: true
        }]
    }],
    
    // DEPRECATED - keeping for backwards compatibility
    timeSlots: [{
        type: String
    }],
    
    bookingLimits: {
        dailyLimit: {
            type: Number,
            default: 2
        },
        weeklyLimit: {
            type: Number,
            default: 4
        },
        advanceBookingLimit: {
            type: Number,
            default: 1
        }
    }
    
}, { timestamps: true });

settingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne({ settingsId: "system_settings" });
    
    if (!settings) {
        settings = await this.create({
            settingsId: "system_settings",
            resourceTypes: [
                { 
                    value: "laundry", 
                    label: "Laundry", 
                    icon: "droplet",
                    timeSlots: [
                        "08:00-09:00",
                        "09:00-10:00",
                        "10:00-11:00",
                        "11:00-12:00",
                        "13:00-14:00",
                        "14:00-15:00",
                        "15:00-16:00",
                        "16:00-17:00"
                    ]
                },
                { 
                    value: "study_room", 
                    label: "Study Room", 
                    icon: "book",
                    timeSlots: [
                        "08:00-09:00",
                        "09:00-10:00",
                        "10:00-11:00",
                        "11:00-12:00",
                        "13:00-14:00",
                        "14:00-15:00",
                        "15:00-16:00",
                        "16:00-17:00",
                        "18:00-19:00",
                        "19:00-20:00",
                        "20:00-21:00"
                    ]
                },
                { 
                    value: "sports", 
                    label: "Sports", 
                    icon: "trophy",
                    timeSlots: [
                        "17:00-18:00",
                        "18:00-19:00",
                        "19:00-20:00",
                        "20:00-21:00",
                        "21:00-22:00",
                        "22:00-23:00"
                    ]
                }
            ],
            timeSlots: [], // deprecated
            bookingLimits: {
                dailyLimit: 2,
                weeklyLimit: 4,
                advanceBookingLimit: 1
            }
        });
    }
    
    return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);