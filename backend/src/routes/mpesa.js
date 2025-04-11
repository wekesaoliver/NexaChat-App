// routes/mpesa.js
import express from "express";
const router = express.Router();
import { initiateSTKPush, checkTransactionStatus } from "../utils/mpesa.js";
import Transaction from "../models/Transaction.js";
import Message from "../models/message.model.js";
import PaymentRequest from "../models/PaymentRequest.js";

// Initiate STK Push
// routes/mpesa.js
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "M-Pesa API route is working",
        env: {
            consumerKeyExists: !!process.env.MPESA_CONSUMER_KEY,
            consumerSecretExists: !!process.env.MPESA_CONSUMER_SECRET,
            passkeyExists: !!process.env.MPESA_PASSKEY,
            shortcodeExists: !!process.env.MPESA_SHORTCODE,
            appUrl: process.env.APP_URL || "Not set",
        },
    });
});

router.post("/initiate", async (req, res, next) => {
    try {
        console.log("Received payment initiation request:", req.body);

        const { phoneNumber, amount, description, recipientId, senderId } =
            req.body;

        // Validate required fields
        if (
            !phoneNumber ||
            !amount ||
            !description ||
            !recipientId ||
            !senderId
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
                missing: Object.entries({
                    phoneNumber,
                    amount,
                    description,
                    recipientId,
                    senderId,
                })
                    .filter(([_, value]) => !value)
                    .map(([key]) => key),
            });
        }

        // Check M-Pesa environment variables
        const requiredEnvVars = [
            "MPESA_CONSUMER_KEY",
            "MPESA_CONSUMER_SECRET",
            "MPESA_PASSKEY",
            "MPESA_SHORTCODE",
        ];
        const missingEnvVars = requiredEnvVars.filter(
            (varName) => !process.env[varName]
        );

        if (missingEnvVars.length > 0) {
            console.error(
                "Missing required M-Pesa environment variables:",
                missingEnvVars
            );
            return res.status(500).json({
                success: false,
                message:
                    "Server configuration error: Missing M-Pesa credentials",
                missing: missingEnvVars,
            });
        }

        // Initiate STK Push
        const response = await initiateSTKPush(
            phoneNumber,
            amount,
            description
        );
        console.log("STK Push response:", response);

        // Store transaction in database
        try {
            await Transaction.create({
                checkoutRequestID: response.CheckoutRequestID,
                merchantRequestID: response.MerchantRequestID,
                amount,
                phoneNumber,
                senderId,
                recipientId,
                description,
                status: "pending",
            });
        } catch (dbError) {
            console.error("Database error (continuing anyway):", dbError);
            // We'll continue even if the database save fails
        }

        return res.json({
            success: true,
            message: "Payment initiated successfully",
            data: {
                checkoutRequestID: response.CheckoutRequestID,
                merchantRequestID: response.MerchantRequestID,
                responseCode: response.ResponseCode,
                responseDescription: response.ResponseDescription,
                customerMessage: response.CustomerMessage,
            },
        });
    } catch (error) {
        console.error("Error in payment initiation:", error);

        // Check for specific error types
        if (error.response && error.response.data) {
            console.error("M-Pesa API error response:", error.response.data);
        }

        // Pass the error to the global error handler
        next(error);
    }
});

// M-Pesa Callback
router.post("/callback", async (req, res) => {
    try {
        const { Body } = req.body;

        if (Body.stkCallback) {
            const {
                ResultCode,
                ResultDesc,
                CheckoutRequestID,
                CallbackMetadata,
            } = Body.stkCallback;

            // Find the transaction in the database
            const transaction = await Transaction.findOne({
                checkoutRequestID: CheckoutRequestID,
            })
                .populate("senderId", "fullName")
                .populate("recipientId", "fullName");

            if (!transaction) {
                console.error("Transaction not found:", CheckoutRequestID);
                return res
                    .status(404)
                    .json({ success: false, message: "Transaction not found" });
            }

            if (ResultCode === 0) {
                // Payment successful
                const paymentDetails =
                    CallbackMetadata?.Item?.reduce((acc, item) => {
                        acc[item.Name] = item.Value;
                        return acc;
                    }, {}) || {};

                // Update transaction in database
                transaction.status = "completed";
                transaction.mpesaReceiptNumber =
                    paymentDetails.MpesaReceiptNumber || null;
                transaction.transactionDate =
                    paymentDetails.TransactionDate || new Date();
                transaction.resultCode = ResultCode.toString();
                transaction.resultDescription = ResultDesc;
                await transaction.save();

                // Emit socket event for successful payment
                io.to(transaction.recipientId.toString()).emit(
                    "payment_completed",
                    {
                        transactionId: transaction._id,
                        senderId: transaction.senderId._id,
                        senderName: transaction.senderId.fullName,
                        amount: transaction.amount,
                        description: transaction.description,
                        receipt: paymentDetails.MpesaReceiptNumber,
                    }
                );

                // Create a message in the chat about the successful payment
                await Message.create({
                    senderId: transaction.senderId._id,
                    receiverId: transaction.recipientId._id,
                    text: `Payment of KES ${transaction.amount} sent successfully.`,
                    isPaymentMessage: true,
                    paymentDetails: {
                        amount: transaction.amount,
                        status: "completed",
                        receipt: paymentDetails.MpesaReceiptNumber,
                    },
                });
            } else {
                // Payment failed
                transaction.status = "failed";
                transaction.resultCode = ResultCode.toString();
                transaction.resultDescription = ResultDesc;
                await transaction.save();

                // Emit socket event for failed payment
                io.to(transaction.senderId.toString()).emit("payment_failed", {
                    transactionId: transaction._id,
                    reason: ResultDesc,
                });
            }
        }

        return res.json({ success: true });
    } catch (error) {
        console.error("Error processing callback:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to process callback" });
    }
});

// Check transaction status
// routes/mpesa.js
router.post("/status", async (req, res, next) => {
    try {
        console.log("Received payment status check request:", req.body);

        const { checkoutRequestID } = req.body;

        if (!checkoutRequestID) {
            return res.status(400).json({
                success: false,
                message: "Checkout request ID is required",
            });
        }

        // Check if the transaction exists in your database first
        try {
            const transaction = await Transaction.findOne({
                checkoutRequestID,
            });

            // If transaction is already marked as completed or failed in your database,
            // return that status instead of checking with M-Pesa again
            if (transaction && transaction.status !== "pending") {
                return res.json({
                    success: true,
                    data: {
                        ResultCode:
                            transaction.status === "completed" ? "0" : "1",
                        ResultDesc:
                            transaction.resultDescription ||
                            (transaction.status === "completed"
                                ? "Success"
                                : "Failed"),
                        mpesaReceiptNumber: transaction.mpesaReceiptNumber,
                    },
                    transaction: {
                        status: transaction.status,
                        amount: transaction.amount,
                        description: transaction.description,
                    },
                });
            }
        } catch (dbError) {
            console.error("Database error (continuing anyway):", dbError);
            // Continue even if database check fails
        }

        // Check M-Pesa environment variables
        const requiredEnvVars = [
            "MPESA_CONSUMER_KEY",
            "MPESA_CONSUMER_SECRET",
            "MPESA_PASSKEY",
            "MPESA_SHORTCODE",
        ];
        const missingEnvVars = requiredEnvVars.filter(
            (varName) => !process.env[varName]
        );

        if (missingEnvVars.length > 0) {
            console.error(
                "Missing required M-Pesa environment variables:",
                missingEnvVars
            );
            return res.status(500).json({
                success: false,
                message:
                    "Server configuration error: Missing M-Pesa credentials",
                missing: missingEnvVars,
            });
        }

        console.log(
            "Checking transaction status with M-Pesa for:",
            checkoutRequestID
        );
        const response = await checkTransactionStatus(checkoutRequestID);
        console.log("M-Pesa status response:", response);

        return res.json({
            success: true,
            data: response,
        });
    } catch (error) {
        console.error("Error checking transaction status:", error);

        // Check for specific error types
        if (error.response && error.response.data) {
            console.error("M-Pesa API error response:", error.response.data);
        }

        // Pass the error to the global error handler
        next(error);
    }
});

export default router;
