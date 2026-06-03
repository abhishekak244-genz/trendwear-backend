const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("./models/Product");
const User = require("./models/User");
const cart = require("./models/cart");
const products = require("./data/products");

dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });

// Function to seed data
const seedData = async () => {
  try {
    // Clear existing data
    await Product.deleteMany();
    await User.deleteMany();
    await cart.deleteMany();

    console.log("Existing data cleared...");

    // Create a default admin user
    const createdUser = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "123456",
      role: "admin",
    });

    console.log("Admin user created...");

    // Assign the default user id to each product
    const userID = createdUser._id;

    const sampleProducts = products.map((product) => {
      return { ...product, user: userID };
    });

    // Insert the products into the database
    await Product.insertMany(sampleProducts);

    console.log("Product data seeded successfully!");
    process.exit();

  } catch (error) {
    console.error("Error seeding the data:", error);
    process.exit(1);
  }
};

// Function to destroy data
const destroyData = async () => {
  try {
    await Product.deleteMany();
    await User.deleteMany();
    await cart.deleteMany();

    console.log("All data destroyed successfully!");
    process.exit();

  } catch (error) {
    console.error("Error destroying the data:", error);
    process.exit(1);
  }
};

// Run seeder or destroyer based on flag
if (process.argv[2] === "--destroy") {
  destroyData();
} else {
  seedData();
}