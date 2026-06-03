const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
// Notice we completely deleted the streamifier import at the top!
require("dotenv").config()
const router = express.Router(); 

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup using memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file Uploaded" });
        }

        // Function to handle the stream upload to Cloudinary
        const streamUpload = (fileBuffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ folder: "trendwear" }, (error, result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                });

                // THIS IS THE MAGIC FIX: We pass the buffer directly to .end()
                stream.end(fileBuffer);
            });
        };

        // Call the streamUpload function
        const result = await streamUpload(req.file.buffer);

        // Respond with the uploaded image URL
        res.status(200).json({ imageUrl: result.secure_url });
    } catch (error) {
        console.error("Upload Error: ", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;