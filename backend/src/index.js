import express from "express";
import paymentRequests from "./routes/paymentRequests.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import mpesaRoutes from "./routes/mpesa.js";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app, server } from "./lib/socket.js";
import path from "path";
import mpesaTestRoutes from "./routes/mpesa-test.js";

dotenv.config();

const port = process.env.PORT || 5001;
const __dirname = path.resolve();

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/payment-requests", paymentRequests);
app.use("/api/mpesa-test", mpesaTestRoutes);

app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({
        success: false,
        message: err.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
});

if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../client/dist")));
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../client", "dist", "index.html"));
    });
}

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    connectDB();
});
