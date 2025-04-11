import axios from "axios";

// Base URLs
const SANDBOX_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_URL = "https://api.safaricom.co.ke";

// Use sandbox for development, switch to production for live environment
const BASE_URL =
    process.env.NODE_ENV === "production" ? PRODUCTION_URL : SANDBOX_URL;

/**
 * Get OAuth token for M-Pesa API authentication
 */
export async function getAccessToken() {
    try {
        const auth = Buffer.from(
            `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
        ).toString("base64");

        const response = await axios.get(
            `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                },
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error("Error getting M-Pesa access token:", error);
        throw new Error("Failed to authenticate with M-Pesa");
    }
}

/**
 * Generate a timestamp in the format required by M-Pesa
 */
export function generateTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");

    return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * Generate the password for STK Push
 */
export function generatePassword(timestamp) {
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

/**
 * Initiate STK Push request
 */
export async function initiateSTKPush(phoneNumber, amount, description) {
    try {
        console.log("Initiating STK Push with:", {
            phoneNumber,
            amount,
            description,
        });

        // Format phone number (remove leading 0 or +254)
        let formattedPhone = phoneNumber;
        if (formattedPhone.startsWith("0")) {
            formattedPhone = "254" + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith("+254")) {
            formattedPhone = formattedPhone.substring(1);
        }

        console.log("Formatted phone number:", formattedPhone);

        // Get access token
        const token = await getAccessToken();
        console.log("Got access token successfully");

        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);

        // Ensure amount is a number
        const numericAmount = Number(amount);
        if (isNaN(numericAmount)) {
            throw new Error("Amount must be a valid number");
        }

        // Prepare the request payload
        const payload = {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: numericAmount,
            PartyA: formattedPhone,
            PartyB: process.env.MPESA_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: `${
                process.env.APP_URL || "http://localhost:5001"
            }/api/mpesa/callback`,
            AccountReference: "NexaChat",
            TransactionDesc: description,
        };

        console.log("STK Push request payload:", payload);

        // Make the API request
        const response = await axios.post(
            `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("STK Push successful");
        return response.data;
    } catch (error) {
        console.error("Error in initiateSTKPush:", error.message);

        if (error.response) {
            console.error("M-Pesa API error response:", {
                status: error.response.status,
                data: error.response.data,
            });
            throw new Error(
                `M-Pesa API error: ${JSON.stringify(error.response.data)}`
            );
        }

        throw error;
    }
}

/**
 * Check transaction status
 */
export async function checkTransactionStatus(checkoutRequestID) {
    try {
        console.log("Checking transaction status for:", checkoutRequestID);

        const token = await getAccessToken();
        console.log("Got access token successfully");

        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);

        const payload = {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID,
        };

        console.log("Status check request payload:", payload);

        const response = await axios.post(
            `${BASE_URL}/mpesa/stkpushquery/v1/query`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Status check successful");
        return response.data;
    } catch (error) {
        console.error("Error in checkTransactionStatus:", error.message);

        if (error.response) {
            console.error("M-Pesa API error response:", {
                status: error.response.status,
                data: error.response.data,
            });

            // If the error is because the transaction is not found or still processing,
            // return a standardized response instead of throwing an error
            if (
                error.response.status === 404 ||
                (error.response.data &&
                    error.response.data.errorCode === "500.001.1001")
            ) {
                return {
                    ResponseCode: "1",
                    ResponseDescription:
                        "Transaction still processing or not found",
                    ResultCode: "1",
                    ResultDesc: "Transaction still processing",
                };
            }

            throw new Error(
                `M-Pesa API error: ${JSON.stringify(error.response.data)}`
            );
        }

        throw error;
    }
}
