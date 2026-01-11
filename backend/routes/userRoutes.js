const express = require("express");
const router = express.Router();

const {
    getAllUsers,
    getUserById,
    deleteUser,
    getUserStats
} = require("../controllers/userController");

const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/", verifyToken, verifyAdmin, getAllUsers);
router.get("/stats", verifyToken, verifyAdmin, getUserStats);
router.get("/:id", verifyToken, verifyAdmin, getUserById);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

module.exports = router;