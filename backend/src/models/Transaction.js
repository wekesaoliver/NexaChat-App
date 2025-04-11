// models/Transaction.js
import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
    {
        checkoutRequestID: {
            type: String,
            required: true,
            unique: true,
        },
        merchantRequestID: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
        },
        mpesaReceiptNumber: {
            type: String,
            default: null,
        },
        transactionDate: {
            type: Date,
            default: null,
        },
        resultCode: {
            type: String,
            default: null,
        },
        resultDescription: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

const Transaction = mongoose.model("Transaction", TransactionSchema);

export default Transaction;
