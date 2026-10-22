
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/eventRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import { authenticateToken } from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Authentication routes: register and login
app.use("/api/auth", authRoutes);

// Events routes: create, list, and view events
app.use("/api/events", eventRoutes);

// Registration routes: view and cancel registrations
app.use("/api/registrations", registrationRoutes);

// Home route
app.get("/", (req, res) => {
    res.send("CampusConnect backend is running!");
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "CampusConnect API is running",
    });
});

// Database connection test
app.get("/api/db-test", async (req, res) => {
    try {
        const totalUsers = await prisma.user.count();

        res.json({
            success: true,
            message: "PostgreSQL connected successfully",
            totalUsers,
        });
    } catch (error) {
        console.error("Database test failed:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
        });
    }
});

// Protected route: current authenticated user
app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: "Authentication successful",
        user: req.user,
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
