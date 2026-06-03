const express = require("express");
const Product = require("../models/product");
const { protect, admin } = require("../middleware/authMiddleware");

// Note: Missing the router initialization statement here in the screenshot,
// but it is required to use router.get()
const router = express.Router(); 

// @route GET /api/admin/products
// @desc Get all products (Admin only)
// @access Private/Admin
router.get("/", protect, admin, async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;