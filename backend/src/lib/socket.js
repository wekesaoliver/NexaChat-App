import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin:
            process.env.NODE_ENV === "production"
                ? [
                      "https://nexachat-app.onrender.com",
                      "https://nexachat-client.onrender.com",
                  ]
                : ["http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Authenticate socket connections with the JWT cookie so a user
// cannot impersonate another user via the handshake query.
io.use((socket, next) => {
    try {
        const cookies = socket.handshake.headers.cookie || "";
        const match = cookies.match(/(?:^|;\s*)jwt=([^;]+)/);
        const token = match ? match[1] : null;
        if (!token) return next(new Error("Unauthorized"));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        next();
    } catch (error) {
        next(new Error("Unauthorized"));
    }
});

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.userId;
    if (userId) userSocketMap[userId] = socket.id;

    //io.emit() is used to send events to all the connected users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Handle payment events
    socket.on("payment_initiated", (data) => {
        const { recipientId } = data;
        if (recipientId) {
            const recipientSocketId = getReceiverSocketId(recipientId);
            if (recipientSocketId) {
                socket.to(recipientSocketId).emit("payment_initiated", data);
            }
        }
    });

    // Add more payment-related socket events
    socket.on("payment_request_sent", (data) => {
        const { recipientId } = data;
        if (recipientId) {
            const recipientSocketId = getReceiverSocketId(recipientId);
            if (recipientSocketId) {
                socket
                    .to(recipientSocketId)
                    .emit("payment_request_received", data);
            }
        }
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected", socket.id);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };
