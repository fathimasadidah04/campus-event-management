
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router();

// Create an event — organizers and admins only
router.post("/", authenticateToken, async (req, res) => {
    try {
        if (!["ORGANIZER", "ADMIN"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Only organizers and admins can create events",
            });
        }

        const {
            title,
            description,
            category,
            venue,
            startAt,
            endAt,
            capacity,
        } = req.body;

        if (
            typeof title !== "string" || !title.trim() ||
            typeof description !== "string" || !description.trim() ||
            typeof category !== "string" || !category.trim() ||
            typeof venue !== "string" || !venue.trim() ||
            !startAt || !endAt ||
            !Number.isInteger(capacity) || capacity < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Provide valid title, description, category, venue, dates, and positive integer capacity",
            });
        }

        const startDate = new Date(startAt);
        const endDate = new Date(endAt);

        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime()) ||
            endDate <= startDate
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "The end date must be later than the start date, and both dates must be valid",
            });
        }

        const event = await prisma.event.create({
            data: {
                title: title.trim(),
                description: description.trim(),
                category: category.trim(),
                venue: venue.trim(),
                startAt: startDate,
                endAt: endDate,
                capacity,
                status: "DRAFT",
                organizerId: req.user.userId,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Event created successfully as a draft",
            event,
        });
    } catch (error) {
        console.error("Event creation failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create event",
        });
    }
});

// Publish an event — only its organizer or an admin can publish it
router.patch("/:id/publish", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const event = await prisma.event.findUnique({
            where: { id },
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        if (
            event.organizerId !== req.user.userId &&
            req.user.role !== "ADMIN"
        ) {
            return res.status(403).json({
                success: false,
                message: "You can only publish your own events",
            });
        }

        if (event.status === "CANCELLED") {
            return res.status(400).json({
                success: false,
                message: "Cancelled events cannot be published",
            });
        }

        const publishedEvent = await prisma.event.update({
            where: { id },
            data: { status: "PUBLISHED" },
        });

        return res.json({
            success: true,
            message: "Event published successfully",
            event: publishedEvent,
        });
    } catch (error) {
        console.error("Publishing event failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to publish event",
        });
    }
});

// Register a student for a published event
router.post("/:id/register", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "STUDENT") {
            return res.status(403).json({
                success: false,
                message: "Only students can register for events",
            });
        }

        const eventId = req.params.id;
        const userId = req.user.userId;

        const event = await prisma.event.findFirst({
            where: {
                id: eventId,
                status: "PUBLISHED",
            },
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Published event not found",
            });
        }

        if (event.startAt <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "Registration is closed because the event has started",
            });
        }

        const existingRegistration = await prisma.registration.findUnique({
            where: {
                userId_eventId: {
                    userId,
                    eventId,
                },
            },
        });

        if (existingRegistration?.status === "CONFIRMED") {
            return res.status(409).json({
                success: false,
                message: "You are already registered for this event",
            });
        }

        // Check the number of confirmed registrations
        const confirmedCount = await prisma.registration.count({
            where: {
                eventId,
                status: "CONFIRMED",
            },
        });

        if (confirmedCount >= event.capacity) {
            return res.status(409).json({
                success: false,
                message: "Sorry, this event is full",
            });
        }

        let registration;

        if (existingRegistration) {
            // Reactivate a previously cancelled registration
            registration = await prisma.registration.update({
                where: {
                    id: existingRegistration.id,
                },
                data: {
                    status: "CONFIRMED",
                },
            });
        } else {
            registration = await prisma.registration.create({
                data: {
                    userId,
                    eventId,
                    status: "CONFIRMED",
                },
            });
        }

        return res.status(201).json({
            success: true,
            message: "Event registration successful",
            registration,
        });
    } catch (error) {
        // The composite unique constraint prevents duplicate records.
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "You are already registered for this event",
            });
        }

        console.error("Event registration failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to register for event",
        });
    }
});

// List published events — available to everyone
router.get("/", async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            where: { status: "PUBLISHED" },
            orderBy: { startAt: "asc" },
        });

        return res.json({
            success: true,
            count: events.length,
            events,
        });
    } catch (error) {
        console.error("Fetching events failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch events",
        });
    }
});

// View one published event
router.get("/:id", async (req, res) => {
    try {
        const event = await prisma.event.findFirst({
            where: {
                id: req.params.id,
                status: "PUBLISHED",
            },
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Published event not found",
            });
        }

        return res.json({
            success: true,
            event,
        });
    } catch (error) {
        console.error("Fetching event failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch event",
        });
    }
});

export default router;
