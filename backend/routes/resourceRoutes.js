const express = require("express");
const router = express.Router();

const {
    createResource,
    getResources,
    updateResource,
    deleteResource,
    updateResourceStatus,
    getAvailableSlots
} = require("../controllers/resourceController");

const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// Create Resource (Admin)
router.post("/", verifyToken, verifyAdmin, createResource);

// Get All Resources
router.get("/", verifyToken, getResources);

// Update Resource (Admin)
router.put("/:id", verifyToken, verifyAdmin, updateResource);

// Delete Resource (Admin)
router.delete("/:id", verifyToken, verifyAdmin, deleteResource);

// Update Resource Status (Admin)
router.put("/status/:id", verifyToken, verifyAdmin, updateResourceStatus);

// CHECK AVAILABLE SLOTS
router.get("/:id/available-slots", verifyToken, getAvailableSlots);

module.exports = router;
