// routes/paymentRequests.js
import express from "express";
const router = express.Router();
import PaymentRequest from "../models/PaymentRequest.js";
import Message from "../models/message.model.js";

// Create payment request
router.post("/", async (req, res) => {
    try {
        const { amount, reason, requesterId, recipientId } = req.body;

        if (!amount || !reason || !requesterId || !recipientId) {
            return res
                .status(400)
                .json({ success: false, message: "All fields are required" });
        }

        // Create new payment request
        const paymentRequest = await PaymentRequest.create({
            amount,
            reason,
            requesterId,
            recipientId,
            status: "pending",
        });

        // Create a message to notify the recipient
        await Message.create({
            senderId: requesterId,
            receiverId: recipientId,
            isPaymentRequest: true,
            paymentRequestId: paymentRequest._id,
            text: `Payment request: ${reason} - KES ${amount}`,
        });

        return res.json({
            success: true,
            message: "Payment request sent successfully",
            paymentRequest,
        });
    } catch (error) {
        console.error("Error creating payment request:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send payment request",
        });
    }
});

// Get payment requests
router.get("/", async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res
                .status(400)
                .json({ success: false, message: "User ID is required" });
        }

        // Get all payment requests where the user is either the requester or recipient
        const paymentRequests = await PaymentRequest.find({
            $or: [{ requesterId: userId }, { recipientId: userId }],
        })
            .sort({ createdAt: -1 })
            .populate("requesterId", "fullName profilePic")
            .populate("recipientId", "fullName profilePic");

        return res.json({
            success: true,
            paymentRequests,
        });
    } catch (error) {
        console.error("Error fetching payment requests:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch payment requests",
        });
    }
});

// Reject payment request
router.post("/:id/reject", async (req, res) => {
    try {
        const { id } = req.params;

        // Find and update the payment request
        const paymentRequest = await PaymentRequest.findByIdAndUpdate(
            id,
            { status: "rejected" },
            { new: true }
        );

        if (!paymentRequest) {
            return res
                .status(404)
                .json({ success: false, message: "Payment request not found" });
        }

        // Create a message to notify the requester
        await Message.create({
            senderId: paymentRequest.recipientId,
            receiverId: paymentRequest.requesterId,
            isPaymentUpdate: true,
            text: `Your payment request of KES ${paymentRequest.amount} for "${paymentRequest.reason}" was rejected.`,
        });

        return res.json({
            success: true,
            message: "Payment request rejected successfully",
            paymentRequest,
        });
    } catch (error) {
        console.error("Error rejecting payment request:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reject payment request",
        });
    }
});

export default router;
