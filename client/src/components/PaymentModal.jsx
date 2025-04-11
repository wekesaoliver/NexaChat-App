// src/components/PaymentModal.jsx
import React, { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { usePaymentStore } from "../store/usePaymentStore";
import { useChatStore } from "../store/useChatStore";

const PaymentModal = ({ isOpen, onClose }) => {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("Payment for services");

    const { selectedUser } = useChatStore();
    const {
        initiatePayment,
        isLoading,
        checkoutRequestID,
        transactionStatus,
        error,
        resetPaymentState,
    } = usePaymentStore();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!phoneNumber || !amount || !description) return;

        await initiatePayment(
            phoneNumber,
            Number(amount),
            description,
            selectedUser?._id
        );
    };

    const handleClose = () => {
        resetPaymentState();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b border-base-300">
                    <h2 className="text-lg font-semibold">Send Payment</h2>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-full hover:bg-base-200"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="p-4">
                    {!checkoutRequestID ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) =>
                                        setPhoneNumber(e.target.value)
                                    }
                                    placeholder="e.g. 0712345678"
                                    className="input input-bordered w-full"
                                    required
                                />
                                <p className="text-xs text-base-content/70 mt-1">
                                    Enter your M-Pesa registered phone number
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Amount (KES)
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="e.g. 100"
                                    className="input input-bordered w-full"
                                    min="1"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    className="input input-bordered w-full"
                                    required
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="btn btn-primary w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="size-4" />
                                            Send Payment
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="py-6 text-center">
                            {transactionStatus === "pending" && (
                                <div className="space-y-4">
                                    <Loader2 className="size-12 animate-spin mx-auto text-primary" />
                                    <h3 className="text-lg font-medium">
                                        Payment Processing
                                    </h3>
                                    <p className="text-base-content/70">
                                        Please check your phone and enter your
                                        M-Pesa PIN to complete the payment.
                                    </p>
                                </div>
                            )}

                            {transactionStatus === "completed" && (
                                <div className="space-y-4">
                                    <div className="size-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="size-8 text-green-600"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium">
                                        Payment Successful!
                                    </h3>
                                    <p className="text-base-content/70">
                                        Your payment has been processed
                                        successfully.
                                    </p>
                                    <button
                                        onClick={handleClose}
                                        className="btn btn-primary"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}

                            {transactionStatus === "failed" && (
                                <div className="space-y-4">
                                    <div className="size-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="size-8 text-red-600"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium">
                                        Payment Failed
                                    </h3>
                                    <p className="text-base-content/70">
                                        {error ||
                                            "There was an error processing your payment."}
                                    </p>
                                    <button
                                        onClick={resetPaymentState}
                                        className="btn btn-primary"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
