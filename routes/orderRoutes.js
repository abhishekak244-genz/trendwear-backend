const express = require("express");
const Order = require("../models/order");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

// @route GET /api/orders/myorders
// @desc Get logged-in user's orders
// @access Private
router.get("/my-orders", protect, async (req, res) => {
    try {
        // Find all orders where the user ID matches the logged-in user
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }); 
        
        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error fetching your orders" });
    }
});

// @route GET /api/orders/:id
// @desc Get order details by ID
// @access Private
router.get("/:id", protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate(
            "user",
            "name email"
        );

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // --- SECURITY FIX: Check if user owns the order OR is an admin ---
        // We use .toString() because MongoDB ObjectIds look like strings but are actually objects!
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(401).json({ message: "Not authorized to view this order" });
        }

        // Return the full order details
        res.status(200).json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;