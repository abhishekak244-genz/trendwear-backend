const express = require("express");
const router = express.Router();
const Subscriber = require("../models/subscriber"); 

// @route POST /api/subscribe
// @desc Handle newsletter subscription
// @access Public
router.post("/", async (req, res) => { // Changed to "/" so it doesn't double up!
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        // 1. Find if the email already exists in the database
        const existingSubscriber = await Subscriber.findOne({ email });
        
        // 2. If they exist, stop and send an error
        if (existingSubscriber) {
            return res.status(400).json({ message: "This email is already subscribed" });
        }

        // 3. Create a new subscriber (using a completely unique variable name)
        const newSubscriber = new Subscriber({ email });
        await newSubscriber.save();

        res.status(201).json({ message: "Successfully subscribed to the newsletter!" });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;