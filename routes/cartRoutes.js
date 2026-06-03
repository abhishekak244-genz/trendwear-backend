const express = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/product");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Helper function to get a cart by user Id or guest ID
const getCart = async (userId, guestId) => {
    if (userId) {
        return await Cart.findOne({ user: userId });
    } else if (guestId) {
        return await Cart.findOne({ guestId });
    }
    return null;
};


// @route POST /api/cart
// @desc Add a product to the cart for a guest or logged in user
// @access Public
router.post("/", async (req, res) => {
    const { productId, quantity, size, color, guestId, userId } = req.body;
    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        // Determine if the user is logged in or guest
        let cart = await getCart(userId, guestId);

        // If the cart exists, update it
        if (cart) {
            const productIndex = cart.products.findIndex(
                (p) =>
                    p.productId.toString() === productId &&
                    p.size === size &&
                    p.color === color
            );

            if (productIndex > -1) {
                // If the product already exists, update the quantity
                cart.products[productIndex].quantity += quantity;
            } else {
                // add new product
                cart.products.push({
                    productId,
                    name: product.name,
                    image: product.images[0].url,
                    price: product.price,
                    size,
                    color,
                    quantity,
                });
            }
            // // Recalculate the total price
            cart.totalPrice = cart.products.reduce(
                (acc, item) => acc + item.price * item.quantity,
                0
            );
            await cart.save();
            return res.status(200).json(cart);
        } else {
            // Create a new cart for the guest or user
            const newCart = await Cart.create({
                user: userId ? userId : undefined,
                guestId: guestId ? guestId : "guest_" + Date.now(),

                products: [
                    {
                        productId,
                        name: product.name,
                        image: product.images[0].url,
                        price: product.price,
                        size,
                        color,
                        quantity,
                    },
                ],

                totalPrice: product.price * quantity,
            });
            return res.status(201).json(newCart);
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server Error",
        });
    }
});


// @route PUT /api/cart
// @desc Update product quantity in the cart
// @access Public

router.put("/", async (req, res) => {
    let { productId, quantity, size, color, guestId, userId } = req.body;

    // Safety Check: Convert quantity to an integer to prevent string math bugs
    // quantity = parseInt(quantity, 10);

    try {
        const cart = await getCart(userId, guestId);

        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const productIndex = cart.products.findIndex(
            (p) =>
                p.productId.toString() === productId &&
                p.size === size &&
                p.color === color
        );


        if (productIndex > -1) {

            if (quantity > 0) {
                cart.products[productIndex].quantity = quantity;
            } else {

                cart.products.splice(productIndex, 1);
            }

            // Recalculate total price
            cart.totalPrice = cart.products.reduce(
                (acc, item) => acc + item.price * item.quantity,
                0
            );

            await cart.save();
            return res.status(200).json(cart);

        } else {

            return res.status(404).json({ message: "Product not found in cart" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server Error",
        });
    }
});

// @route DELETE /api/cart
// @desc Remove a product from the cart
// @access Public

router.delete("/", async (req, res) => {

    // CHANGED THIS LINE: req.query -> req.body
    const { productId, size, color, guestId, userId } = req.body;

    try {
        // Just a friendly reminder from our last step: 
        // In production, get userId from req.user (your auth token), not req.body!
        let cart = await getCart(userId, guestId);

        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const productIndex = cart.products.findIndex(
            (p) =>
                p.productId.toString() === productId &&
                p.size === size &&
                p.color === color
        );

        if (productIndex > -1) {
            cart.products.splice(productIndex, 1);

            cart.totalPrice = cart.products.reduce(
                (acc, item) => acc + item.price * item.quantity,
                0
            );

            await cart.save();
            return res.status(200).json(cart);
        } else {
            return res.status(404).json({ message: "Product not found in cart" });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error" });
    }
});

// @route GET /api/cart
// @desc get logged-in user's or guest user's cart
// @access Public

router.get("/", async (req, res) => {
    const { userId, guestId } = req.query;

    try {
        const cart = await getCart(userId, guestId);
        if (cart) {
            res.json(cart);
        } else {
            return res.status(404).json({ message: "Cart not found" });
        }
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
});

// @route POST /api/cart/merge
// @desc Merge guest cart into user cart on login
// @access Private
router.post("/merge", protect, async (req, res) => {
    const { guestId } = req.body;

    try {
        // Find guest cart and logged-in user's cart
        const guestCart = await Cart.findOne({ guestId });
        const userCart = await Cart.findOne({ user: req.user._id });

        // Guest cart exists
        if (guestCart) {
            if (guestCart.products.length === 0) {
                return res.status(400).json({ message: "Guest cart is empty" });
            }

            if (userCart) {
                // merge guest cart into user cart
                guestCart.products.forEach((guestItem) => {
                    const productIndex = userCart.products.findIndex(
                        (item) =>
                            item.productId.toString() === guestItem.productId.toString() &&
                            item.size === guestItem.size &&
                            item.color === guestItem.color
                    );

                    if (productIndex > -1) {
                        // if the items exist in the user cart update the quantity
                        userCart.products[productIndex].quantity += guestItem.quantity;
                    } else {
                        // otherwise add guest items to the cart
                        userCart.products.push(guestItem);
                    }
                });

                userCart.totalPrice = userCart.products.reduce(
                    (acc, item) => acc + item.price * item.quantity,
                    0
                );

                await userCart.save();

                // Delete guest cart after merge
                try {
                    await Cart.findOneAndDelete({ guestId });
                } catch (error) {
                    console.error(" deleting guest cart:", error);
                }
                return res.status(200).json(userCart);
                
            } else {
                // if the User has no existing cart, convert guest cart into user cart
                guestCart.user = req.user._id;
                guestCart.guestId = null; // FIXED: Changed to null
                
                await guestCart.save();
                return res.status(200).json(guestCart);
            }

        } else {
            if (userCart) {
                return res.status(200).json(userCart);
            }
            // FIXED: Added return keyword
            return res.status(404).json({ message: "Guest cart not found"});
        } 

    } catch (error) {
        console.error("Merge Cart Error:", error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
});



module.exports = router