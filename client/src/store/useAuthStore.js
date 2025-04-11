import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL =
    import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true,
    onlineUsers: [],
    socket: null,

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/auth/check");
            set({ authUser: res.data });
            get().connectSocket();
        } catch (error) {
            console.log("Error in checkAuth:", error);
            set({ authUser: null });
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true });
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({ authUser: res.data });
            toast.success("Account created successfully");

            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isSigningUp: false });
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({ authUser: res.data });
            toast.success("Logged in successfully");

            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isLoggingIn: false });
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
            set({ authUser: null });
            toast.success("Logged out successfully");
            get().disconnectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
            const res = await axiosInstance.put("/auth/update-profile", data);
            set({ authUser: res.data });
            toast.success("Profile updated successfully");
        } catch (error) {
            console.log("error in update profile:", error);
            toast.error(error.response.data.message);
        } finally {
            set({ isUpdatingProfile: false });
        }
    },

    connectSocket: () => {
        const { authUser } = get();
        if (!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, {
            query: {
                userId: authUser._id,
            },
        });
        socket.connect();

        set({ socket: socket });
        //get all online users
        socket.on("getOnlineUsers", (userIds) => {
            set({ onlineUsers: userIds });
        });

        // M-Pesa payment event listeners
        socket.on("payment_initiated", (data) => {
            toast.info(
                `${data.senderName} is sending you a payment of KES ${data.amount}`
            );
        });

        socket.on("payment_completed", (data) => {
            toast.success(
                `Payment of KES ${data.amount} received from ${data.senderName}`
            );
            // If you have a function to add messages to the chat
            if (window.addPaymentMessage) {
                window.addPaymentMessage({
                    _id: Date.now().toString(),
                    senderId: data.senderId,
                    receiverId: authUser._id,
                    text: `Payment of KES ${data.amount} received.`,
                    isPaymentMessage: true,
                    paymentDetails: {
                        amount: data.amount,
                        status: "completed",
                        receipt: data.receipt,
                    },
                    createdAt: new Date().toISOString(),
                });
            }
        });

        socket.on("payment_failed", (data) => {
            toast.error(`Payment failed: ${data.reason}`);
        });

        socket.on("payment_request_received", (data) => {
            toast.info(
                `${data.requesterName} has requested KES ${data.amount} for ${data.reason}`
            );
        });

        socket.on("payment_request_updated", (data) => {
            const statusMessage =
                data.status === "paid"
                    ? `Your payment request of KES ${data.amount} was paid`
                    : `Your payment request of KES ${data.amount} was rejected`;

            toast[data.status === "paid" ? "success" : "error"](statusMessage);
        });
    },
    disconnectSocket: () => {
        if (get().socket?.connected) get().socket.disconnect();
    },

    emitPaymentEvent: (eventName, data) => {
        const socket = get().socket;
        if (socket?.connected) {
            socket.emit(eventName, data);
        }
    },
}));
