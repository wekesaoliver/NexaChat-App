import axios from "axios";

// Determine which environment to use
const isSandbox =
    process.env.NODE_ENV !== "production" ||
    (process.env.MPESA_ENV && process.env.MPESA_ENV === "sandbox");

// Base URLs
const SANDBOX_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_URL = "https://api.safaricom.co.ke";

// Use sandbox for development, switch to production for live environment
const BASE_URL = isSandbox ? SANDBOX_URL : PRODUCTION_URL;

/**
 * Get OAuth token for M-Pesa API authentication
 */
export async function getAccessToken() {
    try {
        // Check if credentials are available
        if (
            !process.env.MPESA_CONSUMER_KEY ||
            !process.env.MPESA_CONSUMER_SECRET
        ) {
            console.error("M-Pesa credentials missing");
            throw new Error("M-Pesa credentials are not configured");
        }

        // Log environment info (without exposing secrets)
        console.log("M-Pesa Auth - Environment:", {
            environment: isSandbox ? "SANDBOX" : "PRODUCTION",
            baseUrl: BASE_URL,
            hasConsumerKey: !!process.env.MPESA_CONSUMER_KEY,
            hasConsumerSecret: !!process.env.MPESA_CONSUMER_SECRET,
            consumerKeyLength: process.env.MPESA_CONSUMER_KEY?.length,
            consumerSecretLength: process.env.MPESA_CONSUMER_SECRET?.length,
        });

        // Create auth string - trim any whitespace that might have been accidentally included
        const consumerKey = process.env.MPESA_CONSUMER_KEY.trim();
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET.trim();
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
            "base64"
        );

        console.log("M-Pesa Auth - Making authentication request");

        const response = await axios.get(
            `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/json",
                },
                timeout: 15000, // 15 second timeout
            }
        );

        if (!response.data || !response.data.access_token) {
            console.error("Invalid response from M-Pesa:", response.data);
            throw new Error("Invalid response from M-Pesa authentication");
        }

        console.log("M-Pesa Auth - Authentication successful");
        return response.data.access_token;
    } catch (error) {
        console.error("M-Pesa Auth - Error details:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });

        throw new Error(`Failed to authenticate with M-Pesa: ${error.message}`);
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
    const shortcode = process.env.MPESA_SHORTCODE?.trim();
    const passkey = process.env.MPESA_PASSKEY?.trim();

    if (!shortcode || !passkey) {
        throw new Error("M-Pesa shortcode or passkey is missing");
    }

    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

const VALID_TRANSACTION_TYPES = [
    "CustomerPayBillOnline",
    "CustomerBuyGoodsOnline",
];

/**
 * Validate admin-prompt request body fields.
 * Returns an error message string, or null if valid.
 */
export function validateAdminPromptInput({ recipientId, amount, description }) {
    if (!recipientId) {
        return "Recipient is required";
    }
    if (amount === undefined || amount === null || amount === "") {
        return "Amount is required";
    }
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return "Amount must be a positive number";
    }
    if (!description) {
        return "Description is required";
    }
    return null;
}

/**
 * Build the STK Push request payload.
 *
 * PayBill (CustomerPayBillOnline): BusinessShortCode = PartyB = shortcode
 * Till  (CustomerBuyGoodsOnline): BusinessShortCode = shortcode, PartyB = till number
 */
export function buildSTKPushRequest({
    shortcode,
    passkey,
    timestamp,
    phoneNumber,
    amount,
    description,
    callbackUrl,
    transactionType = "CustomerPayBillOnline",
    tillNumber,
}) {
    if (!VALID_TRANSACTION_TYPES.includes(transactionType)) {
        throw new Error(
            `Invalid MPESA_TRANSACTION_TYPE: ${transactionType}. Must be one of: ${VALID_TRANSACTION_TYPES.join(", ")}`
        );
    }

    const isTillTransaction = transactionType === "CustomerBuyGoodsOnline";
    if (isTillTransaction && !tillNumber) {
        throw new Error(
            "MPESA_TILL_NUMBER is required for Till (CustomerBuyGoodsOnline) transactions"
        );
    }

    const password = Buffer.from(
        `${shortcode}${passkey}${timestamp}`
    ).toString("base64");

    return {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: transactionType,
        Amount: Math.round(amount), // M-Pesa requires whole numbers
        PartyA: phoneNumber,
        PartyB: isTillTransaction ? tillNumber : shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: callbackUrl,
        AccountReference: "NexaChat",
        TransactionDesc: description,
    };
}

/**
 * Initiate STK Push request
 */
export async function initiateSTKPush(phoneNumber, amount, description) {
    try {
        console.log("M-Pesa - Initiating payment:", {
            phoneNumber,
            amount,
            description,
        });

        // Validate inputs
        if (!phoneNumber) throw new Error("Phone number is required");
        if (!amount) throw new Error("Amount is required");
        if (!description) throw new Error("Description is required");

        // Format phone number (remove leading 0 or +254)
        let formattedPhone = phoneNumber;
        if (formattedPhone.startsWith("0")) {
            formattedPhone = "254" + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith("+254")) {
            formattedPhone = formattedPhone.substring(1);
        }

        if (!/^254\d{9}$/.test(formattedPhone)) {
            console.warn("Phone number format may be invalid:", formattedPhone);
        }

        console.log("M-Pesa - Formatted phone number:", formattedPhone);

        // Get access token
        const token = await getAccessToken();
        console.log("M-Pesa - Got access token");

        const timestamp = generateTimestamp();

        // Get the callback URL
        const appUrl =
            process.env.APP_URL || (isSandbox ? "http://localhost:5001" : "");
        const callbackUrl =
            process.env.MPESA_CALLBACK_URL || `${appUrl}/api/mpesa/callback`;

        console.log("M-Pesa - Using callback URL:", callbackUrl);

        // Ensure amount is a number
        const numericAmount = Number(amount);
        if (isNaN(numericAmount)) {
            throw new Error("Amount must be a valid number");
        }

        // Prepare request data (PayBill or Till based on MPESA_TRANSACTION_TYPE)
        const requestData = buildSTKPushRequest({
            shortcode: process.env.MPESA_SHORTCODE.trim(),
            passkey: process.env.MPESA_PASSKEY.trim(),
            timestamp,
            phoneNumber: formattedPhone,
            amount: numericAmount,
            description,
            callbackUrl,
            transactionType:
                process.env.MPESA_TRANSACTION_TYPE?.trim() ||
                "CustomerPayBillOnline",
            tillNumber: process.env.MPESA_TILL_NUMBER?.trim(),
        });

        console.log("M-Pesa - Request data:", JSON.stringify(requestData));

        // Send STK push request
        const response = await axios.post(
            `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
            requestData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 20000, // 20 second timeout
            }
        );

        console.log("M-Pesa - STK push successful:", response.data);
        return response.data;
    } catch (error) {
        console.error("M-Pesa - STK push error:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });

        throw new Error(`Failed to initiate payment: ${error.message}`);
    }
}

/**
 * Check transaction status
 */
export async function checkTransactionStatus(checkoutRequestID) {
    try {
        const token = await getAccessToken();
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);

        const response = await axios.post(
            `${BASE_URL}/mpesa/stkpushquery/v1/query`,
            {
                BusinessShortCode: process.env.MPESA_SHORTCODE.trim(),
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestID,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error("Error checking transaction status:", error);
        throw new Error("Failed to check payment status");
    }
}
