
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router();

// GET /api/registrations/me
// View the logged-in student's event registrations
router.get("/me", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const registrations = await prisma.registration.findMany({
            where: { userId },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        category: true,
                        venue: true,
                        startAt: true,
                        endAt: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.json({
            success: true,
            count: registrations.length,
            registrations,
        });
    } catch (error) {
        console.error("Fetch registrations error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch registrations.",
        });
    }
});

// PATCH /api/registrations/:id/cancel
// Cancel the logged-in user's own registration
router.patch("/:id/cancel", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const registration = await prisma.registration.findUnique({
            where: { id },
            include: { event: true },
        });

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: "Registration not found.",
            });
        }

        if (registration.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: "You can only cancel your own registration.",
            });
        }

        if (registration.status === "CANCELLED") {
            return res.status(400).json({
                success: false,
                message: "This registration is already cancelled.",
            });
        }

        if (new Date(registration.event.startAt) <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "Registration cannot be cancelled after the event starts.",
            });
        }

        const updated = await prisma.registration.update({
            where: { id },
            data: { status: "CANCELLED" },
        });

        return res.json({
            success: true,
            message: "Registration cancelled successfully.",
            registration: updated,
        });
    } catch (error) {
        console.error("Cancel registration error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to cancel registration.",
        });
    }
});

export default router;
