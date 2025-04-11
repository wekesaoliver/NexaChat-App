import mongoose from "mongoose";

const PaymentRequestSchema = new mongoose.Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        requesterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "paid", "rejected"],
            default: "pending",
        },
        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transaction",
            default: null,
        },
    },
    { timestamps: true }
);

const PaymentRequest = mongoose.model("PaymentRequest", PaymentRequestSchema);

export default PaymentRequest;
