const express = require("express");
const cors = require("cors");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "https://relief-goods.web.app", credentials: true }));
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("reliefGoods");
    const collection = db.collection("users");
    const supplyCollection = db.collection("supply");
    const donateCollection = db.collection("donation");
    const commentsCollection = db.collection("comments");

    // User Registration
    app.post("/api/auth/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/auth/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });
    app.get("/api/auth/all-supplies", async (req, res) => {
      const result = await supplyCollection.find().toArray();
      res.send(result);
    });

    app.post("/api/auth/all-supplies", async (req, res) => {
      const { image, category, title, amount, description } = req.body;
      const result = await supplyCollection.insertOne({
        image,
        category,
        title,
        amount,
        description,
      });
      res.json({
        success: true,
        message: "New supply added successful",
      });
    });

    app.put("/api/auth/all-supplies/:id", async (req, res) => {
      try {
        const itemId = req.params.id;
        const filter = { _id: new ObjectId(itemId) }; // Assuming you're using MongoDB ObjectId
        const updatedData = req.body; // Updated data received from the client

        const updateFields = {};
        for (const key in updatedData) {
          if (updatedData.hasOwnProperty(key)) {
            updateFields[key] = updatedData[key];
          }
        }

        const result = await supplyCollection.updateOne(filter, {
          $set: updateFields,
        });

        if (result.modifiedCount === 1) {
          // Supply item updated successfully
          res.status(200).json({ message: "Supply item updated successfully" });
        } else {
          // No supply item found with the given ID
          res.status(404).json({ message: "Supply item not found" });
        }
      } catch (error) {
        console.error("Error updating supply item:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.delete("/api/auth/all-supplies/:id", async (req, res) => {
      const itemId = req.params.id;
      const query = { _id: new ObjectId(itemId) };
      const result = await supplyCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/api/auth/donate", async (req, res) => {
      const data = await donateCollection.find().toArray();

      const currentDate = new Date();
      const lastThreeMonths = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 2,
        1
      );
      const filteredData = data.filter(
        (donation) => new Date(donation.donationDate) >= lastThreeMonths
      );

      const monthlyData = {};
      filteredData.forEach((donation) => {
        const monthYear = new Date(donation.donationDate).toLocaleString(
          "default",
          { month: "long", year: "numeric" }
        );
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = 0;
        }
        monthlyData[monthYear] += parseFloat(
          donation.donationInfo.donatedField.amount
        );
      });

      res.send({ monthlyData, data });
    });

    app.post("/api/auth/donate", async (req, res) => {
      const donationInfo = req.body;
      const currentDate = new Date();
      const result = await donateCollection.insertOne({
        donationInfo,
        donationDate: currentDate,
        status: "Pending",
      });
      res.json({
        success: true,
        message: "New supply added successful",
      });
    });

    app.get("/api/auth/comments", async (req, res) => {
      const result = await commentsCollection.find().toArray();
      res.send(result);
    });

    app.post("/api/auth/comments", async (req, res) => {
      const data = req.body;
      const currentDate = new Date();
      const result = await commentsCollection.insertOne({
        data,
        currentDate,
      });
      res.json({
        success: true,
        message: "comment added successful",
      });
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
