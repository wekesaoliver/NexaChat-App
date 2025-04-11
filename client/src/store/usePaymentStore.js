// src/store/usePaymentStore.js
import { create } from "zustand";
import { useAuthStore } from "./useAuthStore.js";

export const usePaymentStore = create((set, get) => ({
    isLoading: false,
    checkoutRequestID: null,
    transactionStatus: null,
    error: null,
    statusCheckAttempts: 0, // track attempts
    maxStatusCheckAttempts: 12,

    initiatePayment: async (phoneNumber, amount, description, recipientId) => {
        set({ isLoading: true, error: null });

        try {
            console.log("Initiating payment with:", {
                phoneNumber,
                amount,
                description,
                recipientId,
            });

            // Get the current user ID from the auth store
            const { authUser } = useAuthStore.getState();

            if (!authUser?._id) {
                throw new Error("You must be logged in to make payments");
            }

            const payload = {
                phoneNumber,
                amount: Number(amount), // Ensure amount is a number
                description,
                recipientId,
                senderId: authUser._id,
            };

            console.log("Payment payload:", payload);

            const response = await fetch("/api/mpesa/initiate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            // Check if response is ok
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.message || "Failed to initiate payment"
                );
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || "Failed to initiate payment");
            }

            set({
                checkoutRequestID: data.data.checkoutRequestID,
                transactionStatus: "pending",
            });

            // Start polling for payment status
            setTimeout(() => {
                get().checkPaymentStatus(data.data.checkoutRequestID);
            }, 5000);
        } catch (error) {
            console.error("Payment initiation error:", error);
            set({ error: error.message || "Failed to initiate payment" });
        } finally {
            set({ isLoading: false });
        }
    },

    checkPaymentStatus: async (checkoutRequestID) => {
        if (!checkoutRequestID) return;

        // Check if we've exceeded the maximum number of attempts
        const currentAttempts = get().statusCheckAttempts;
        if (currentAttempts >= get().maxStatusCheckAttempts) {
            set({
                transactionStatus: "unknown",
                error: "Payment status check timed out. Please check your M-Pesa app or SMS for confirmation.",
            });
            return;
        }

        // Increment the attempt counter
        set({ statusCheckAttempts: currentAttempts + 1 });

        try {
            console.log("Checking payment status for:", checkoutRequestID);

            const response = await fetch("/api/mpesa/status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ checkoutRequestID }),
            });

            // Check if response is ok
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Error response from status check:", errorData);

                // If we get a server error, wait and try again
                setTimeout(() => {
                    get().checkPaymentStatus(checkoutRequestID);
                }, 5000);
                return;
            }

            const data = await response.json();
            console.log("Payment status response:", data);

            if (!data.success) {
                console.error("Unsuccessful status check:", data);
                setTimeout(() => {
                    get().checkPaymentStatus(checkoutRequestID);
                }, 5000);
                return;
            }

            // Check if transaction is completed
            if (
                data.data.ResultCode === "0" ||
                (data.transaction && data.transaction.status === "completed")
            ) {
                set({
                    transactionStatus: "completed",
                    receiptNumber:
                        data.data.mpesaReceiptNumber ||
                        data.transaction?.mpesaReceiptNumber,
                });
            }
            // Check if transaction failed
            else if (
                data.data.ResultCode !== "1" ||
                (data.transaction && data.transaction.status === "failed")
            ) {
                set({
                    transactionStatus: "failed",
                    error: data.data.ResultDesc || "Payment failed",
                });
            }
            // If still processing, poll again after a delay
            else {
                console.log(
                    "Transaction still processing, will check again..."
                );
                setTimeout(() => {
                    get().checkPaymentStatus(checkoutRequestID);
                }, 5000);
            }
        } catch (error) {
            console.error("Error checking payment status:", error);

            // If there's an error, try again after a delay
            setTimeout(() => {
                get().checkPaymentStatus(checkoutRequestID);
            }, 5000);
        }
    },

    resetPaymentState: () => {
        set({
            checkoutRequestID: null,
            transactionStatus: null,
            error: null,
            statusCheckAttempts: 0, // Reset the attempt counter
        });
    },
}));
