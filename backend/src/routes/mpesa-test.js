import express from "express";
import { getAccessToken } from "../utils/mpesa.js";

const router = express.Router();

router.get("/auth-test", async (req, res) => {
    try {
        // Check environment variables
        const envCheck = {
            MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY
                ? "Set (length: " + process.env.MPESA_CONSUMER_KEY.length + ")"
                : "Missing",
            MPESA_CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET
                ? "Set (length: " +
                  process.env.MPESA_CONSUMER_SECRET.length +
                  ")"
                : "Missing",
            MPESA_PASSKEY: process.env.MPESA_PASSKEY
                ? "Set (length: " + process.env.MPESA_PASSKEY.length + ")"
                : "Missing",
            MPESA_SHORTCODE: process.env.MPESA_SHORTCODE ? "Set" : "Missing",
            APP_URL: process.env.APP_URL || "Not set",
            NODE_ENV: process.env.NODE_ENV || "Not set",
            MPESA_ENV: process.env.MPESA_ENV || "Not set",
        };

        // Test authentication
        console.log("Testing M-Pesa authentication...");
        const token = await getAccessToken();

        res.json({
            success: true,
            message: "M-Pesa authentication successful",
            token: token ? "Received (hidden)" : "Not received",
            envCheck,
        });
    } catch (error) {
        console.error("M-Pesa auth test failed:", error);
        res.status(500).json({
            success: false,
            message: "M-Pesa authentication failed",
            error: error.message,
            envCheck: {
                MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY
                    ? "Set (length: " +
                      process.env.MPESA_CONSUMER_KEY.length +
                      ")"
                    : "Missing",
                MPESA_CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET
                    ? "Set (length: " +
                      process.env.MPESA_CONSUMER_SECRET.length +
                      ")"
                    : "Missing",
                MPESA_PASSKEY: process.env.MPESA_PASSKEY
                    ? "Set (length: " + process.env.MPESA_PASSKEY.length + ")"
                    : "Missing",
                MPESA_SHORTCODE: process.env.MPESA_SHORTCODE
                    ? "Set"
                    : "Missing",
                APP_URL: process.env.APP_URL || "Not set",
                NODE_ENV: process.env.NODE_ENV || "Not set",
                MPESA_ENV: process.env.MPESA_ENV || "Not set",
            },
        });
    }
});

export default router;
