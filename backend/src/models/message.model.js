import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
        },
        image: {
            type: String,
        },
        isPaymentMessage: {
            type: Boolean,
            default: false,
        },
        paymentDetails: {
            amount: {
                type: Number,
            },
            status: {
                type: String,
                enum: ["pending", "completed", "failed"],
            },
            receipt: {
                type: String,
            },
        },
        isPaymentRequest: {
            type: Boolean,
            default: false,
        },
        paymentRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentRequest",
            default: null,
        },
        isPaymentUpdate: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Add virtual for payment request
MessageSchema.virtual("paymentRequest", {
    ref: "PaymentRequest",
    localField: "paymentRequestId",
    foreignField: "_id",
    justOne: true,
});

MessageSchema.set("toObject", { virtuals: true });
MessageSchema.set("toJSON", { virtuals: true });

const Message = mongoose.model("Message", MessageSchema);

export default Message;
