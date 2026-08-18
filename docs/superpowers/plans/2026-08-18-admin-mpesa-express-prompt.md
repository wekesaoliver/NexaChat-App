# Admin M-Pesa Express Prompt + Role-Based Payment UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a phone field to user profiles, harden the M-Pesa initiate endpoint, add an admin-only `/api/mpesa/admin-prompt` endpoint that sends a real STK push to a user's phone, and swap the chat-header payment button by role (admin sees "M-Pesa Express", regular users see "Pay with Till").

**Architecture:** Backend adds `phone` to the User model and a new `requireAdmin`-protected STK push endpoint that reads the recipient's phone from the DB. Client adds a phone field to signup/settings, a new `AdminPromptModal`, and a role-based button swap in `ChatHeader`/`MessageInput`.

**Tech Stack:** Node.js/Express (backend), React 19 + Zustand + Vite (client), MongoDB/Mongoose, M-Pesa Daraja STK Push.

## Global Constraints

- Follow existing code style: 4-space indent, double quotes, semicolons (backend); existing JSX conventions (client).
- Secrets stay in `.env` — never hardcode M-Pesa credentials.
- M-Pesa transaction types are exactly `CustomerPayBillOnline` (PayBill) and `CustomerBuyGoodsOnline` (Till) — no other values.
- Backend tests run with `node --test` from `backend/`; tests are co-located as `*.test.js` next to source files.
- Client has no test runner — verify via `npm run build` (from `client/`) and manual browser checks.
- Do not modify the payment-request flow, the posts feed, or the M-Pesa callback handler.

---

### Task 1: Backend — Add `phone` to User model and auth controller

**Files:**
- Modify: `backend/src/models/user.model.js`
- Modify: `backend/src/controllers/auth.controller.js`
- Test: `backend/src/models/user.model.test.js` (create)

**Interfaces:**
- Produces: `User` schema has `phone: String, default ""`. `signup` accepts `phone` in body and returns it. `login` returns `phone`. `updateProfile` accepts `phone` (and no longer requires `profilePic`).

- [ ] **Step 1: Write the failing model test**

Create `backend/src/models/user.model.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import User from "./user.model.js";

test("User schema includes phone field with default empty string", () => {
    const path = User.schema.path("phone");
    assert.ok(path, "phone field should exist");
    assert.equal(path.instance, "String");
    assert.equal(path.defaultValue, "");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` (from `backend/`)
Expected: FAIL — `phone field should exist` assertion fails (field not defined yet).

- [ ] **Step 3: Add `phone` to the User model**

In `backend/src/models/user.model.js`, add after the `profilePic` field (line 22):

```js
        phone: {
            type: String,
            default: "",
        },
```

- [ ] **Step 4: Update `signup` to accept and return `phone`**

In `backend/src/controllers/auth.controller.js`, change line 8:

```js
  const { fullName, email, password, adminCode, phone } = req.body;
```

Change the `new User({...})` block (lines 27-32) to include phone:

```js
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      role,
      phone: phone || "",
    });
```

Change the signup response (lines 39-45) to include phone:

```js
      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
        role: newUser.role,
        phone: newUser.phone,
      });
```

- [ ] **Step 5: Update `login` response to include `phone`**

In `backend/src/controllers/auth.controller.js`, change the login response (lines 71-77):

```js
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      role: user.role,
      phone: user.phone,
    });
```

- [ ] **Step 6: Update `updateProfile` to accept `phone` (and not require `profilePic`)**

Replace the entire `updateProfile` function (lines 94-115) in `backend/src/controllers/auth.controller.js`:

```js
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, phone } = req.body;
    const userId = req.user._id;

    const updates = {};
    if (phone !== undefined) updates.phone = phone;
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updates.profilePic = uploadResponse.secure_url;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test` (from `backend/`)
Expected: PASS — all tests including the new model test.

- [ ] **Step 8: Commit**

```bash
git add backend/src/models/user.model.js backend/src/models/user.model.test.js backend/src/controllers/auth.controller.js
git commit -m "feat: add phone field to user profile and auth endpoints"
```

---

### Task 2: Backend — Harden `/initiate` and add `/admin-prompt` endpoint

**Files:**
- Modify: `backend/src/routes/mpesa.js`
- Test: `backend/src/utils/mpesa.test.js` (create)

**Interfaces:**
- Consumes: `initiateSTKPush(phoneNumber, amount, description)` from `../utils/mpesa.js`; `protectRoute`, `requireAdmin` from `../middleware/auth.middleware.js`; `User` model.
- Produces: `POST /api/mpesa/initiate` (auth-protected, `senderId = req.user._id`); `POST /api/mpesa/admin-prompt` (admin-only, body `{ recipientId, amount, description }`, reads recipient phone from DB, creates Transaction with `senderId = recipientId`, `recipientId = req.user._id`).

- [ ] **Step 1: Write tests for `buildSTKPushRequest` (regression for Till/PayBill)**

Create `backend/src/utils/mpesa.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSTKPushRequest } from "./mpesa.js";

const base = {
    shortcode: "5874806",
    passkey: "testpasskey",
    timestamp: "20260818120000",
    phoneNumber: "254708374149",
    amount: 150,
    description: "Test payment",
    callbackUrl: "https://example.com/api/mpesa/callback",
};

test("buildSTKPushRequest: PayBill uses shortcode for BusinessShortCode and PartyB", () => {
    const req = buildSTKPushRequest({
        ...base,
        transactionType: "CustomerPayBillOnline",
    });
    assert.equal(req.TransactionType, "CustomerPayBillOnline");
    assert.equal(req.BusinessShortCode, "5874806");
    assert.equal(req.PartyB, "5874806");
    assert.equal(req.Amount, 150);
});

test("buildSTKPushRequest: Till uses shortcode for BusinessShortCode and till number for PartyB", () => {
    const req = buildSTKPushRequest({
        ...base,
        transactionType: "CustomerBuyGoodsOnline",
        tillNumber: "3480482",
    });
    assert.equal(req.TransactionType, "CustomerBuyGoodsOnline");
    assert.equal(req.BusinessShortCode, "5874806");
    assert.equal(req.PartyB, "3480482");
});

test("buildSTKPushRequest: rejects invalid transaction type", () => {
    assert.throws(
        () => buildSTKPushRequest({ ...base, transactionType: "BuyGoodsOnline" }),
        /Invalid MPESA_TRANSACTION_TYPE/
    );
});

test("buildSTKPushRequest: Till requires tillNumber", () => {
    assert.throws(
        () =>
            buildSTKPushRequest({
                ...base,
                transactionType: "CustomerBuyGoodsOnline",
            }),
        /MPESA_TILL_NUMBER is required/
    );
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test` (from `backend/`)
Expected: PASS — `buildSTKPushRequest` already exists from the Till work.

- [ ] **Step 3: Add imports to `backend/src/routes/mpesa.js`**

At the top of the file (after line 8), add:

```js
import User from "../models/user.model.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
```

- [ ] **Step 4: Harden `POST /initiate`**

Change line 130 from:

```js
router.post("/initiate", async (req, res, next) => {
```

to:

```js
router.post("/initiate", protectRoute, async (req, res, next) => {
```

Change the destructure (line 134) from:

```js
        const { phoneNumber, amount, description, recipientId, senderId } =
            req.body;
```

to:

```js
        const { phoneNumber, amount, description, recipientId } = req.body;
        const senderId = req.user._id;
```

Change the validation block (lines 138-158) to drop `senderId` from the required check:

```js
        // Validate required fields
        if (!phoneNumber || !amount || !description || !recipientId) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
                missing: Object.entries({
                    phoneNumber,
                    amount,
                    description,
                    recipientId,
                })
                    .filter(([_, value]) => !value)
                    .map(([key]) => key),
            });
        }
```

- [ ] **Step 5: Add the `POST /admin-prompt` route**

Insert this new route immediately after the `/initiate` route (after line 242, before the `/diagnose` route):

```js
// admin-prompt route (admin only) — sends an STK push to a user's phone
router.post(
    "/admin-prompt",
    protectRoute,
    requireAdmin,
    async (req, res, next) => {
        try {
            console.log("Received admin payment prompt:", req.body);

            const { recipientId, amount, description } = req.body;

            // Validate required fields
            if (!recipientId || !amount || !description) {
                return res.status(400).json({
                    success: false,
                    message: "All fields are required",
                    missing: Object.entries({
                        recipientId,
                        amount,
                        description,
                    })
                        .filter(([_, value]) => !value)
                        .map(([key]) => key),
                });
            }

            // Look up the recipient and read their phone from the DB
            const recipient = await User.findById(recipientId);
            if (!recipient) {
                return res
                    .status(404)
                    .json({ success: false, message: "User not found" });
            }
            if (!recipient.phone) {
                return res.status(400).json({
                    success: false,
                    message: "User has no phone number on file",
                });
            }

            // Initiate STK Push to the recipient's phone
            const response = await initiateSTKPush(
                recipient.phone,
                amount,
                description
            );
            console.log("STK Push response:", response);

            // Store transaction in database (payer = recipient, receiver = admin)
            try {
                const transaction = await Transaction.create({
                    checkoutRequestID: response.CheckoutRequestID,
                    merchantRequestID: response.MerchantRequestID,
                    amount,
                    phoneNumber: recipient.phone,
                    senderId: recipientId,
                    recipientId: req.user._id,
                    description,
                    status: "pending",
                });

                // Notify the admin via socket
                const adminSocketId = getReceiverSocketId(req.user._id);
                if (adminSocketId) {
                    io.to(adminSocketId).emit("payment_initiated", {
                        transactionId: transaction._id,
                        senderId: recipientId,
                        amount,
                        description,
                    });
                }
            } catch (dbError) {
                console.error("Database error (continuing anyway):", dbError);
            }

            return res.json({
                success: true,
                message: "Payment initiated successfully",
                data: {
                    checkoutRequestID: response.CheckoutRequestID,
                    merchantRequestID: response.MerchantRequestID,
                    responseCode: response.ResponseCode,
                    responseDescription: response.ResponseDescription,
                    customerMessage: response.CustomerMessage,
                },
            });
        } catch (error) {
            console.error("Error in admin payment prompt:", error);
            if (error.response && error.response.data) {
                console.error("M-Pesa API error response:", error.response.data);
            }
            next(error);
        }
    }
);
```

- [ ] **Step 6: Run tests and verify backend starts**

Run: `npm test` (from `backend/`)
Expected: PASS.

Run: `npm run dev` (from `backend/`) — verify it starts without errors. Then verify the route is protected:

```bash
curl -s -X POST http://localhost:5001/api/mpesa/admin-prompt -H "Content-Type: application/json" -d '{"recipientId":"507f1f77bcf86cd799439011","amount":1,"description":"test"}'
```

Expected: `401` (Unauthorized — no JWT cookie).

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/mpesa.js backend/src/utils/mpesa.test.js
git commit -m "feat: add admin-only M-Pesa Express prompt endpoint and protect initiate"
```

---

### Task 3: Backend — Verify `phone` is exposed in sidebar users

**Files:**
- Verify: `backend/src/controllers/message.controller.js` (no change expected)

**Interfaces:**
- Consumes: `getUsersForSidebar` returns all user fields except password (via `.select("-password")`).
- Produces: Sidebar user objects include `phone` (used by the admin prompt modal).

- [ ] **Step 1: Confirm `phone` is already included**

`getUsersForSidebar` (line 10-12) uses `User.find({...}).select("-password")`, which returns every field except `password`. Since `phone` was added to the schema in Task 1, it is automatically included. No code change needed.

- [ ] **Step 2: Verify with a live request**

With the backend running, call:

```bash
curl -s http://localhost:5001/api/messages/users -H "Cookie: jwt=<your-jwt-cookie>"
```

Expected: each user object includes a `phone` field.

- [ ] **Step 3: Commit (if any change was made)**

If no change was needed, skip the commit. If a change was made, commit it.

---

### Task 4: Client — Add `adminPromptPayment` to payment store

**Files:**
- Modify: `client/src/store/usePaymentStore.js`

**Interfaces:**
- Consumes: existing `checkPaymentStatus`, `resetPaymentState`, `isLoading`, `checkoutRequestID`, `transactionStatus`, `error` state.
- Produces: `adminPromptPayment(recipientId, amount, description)` — POSTs to `/api/mpesa/admin-prompt`, sets `checkoutRequestID` + `transactionStatus: "pending"`, starts status polling.

- [ ] **Step 1: Add the `adminPromptPayment` action**

In `client/src/store/usePaymentStore.js`, insert this action after `initiatePayment` (after line 78):

```js
    adminPromptPayment: async (recipientId, amount, description) => {
        set({ isLoading: true, error: null });

        try {
            console.log("Admin prompting payment for:", {
                recipientId,
                amount,
                description,
            });

            const payload = {
                recipientId,
                amount: Number(amount),
                description,
            };

            const response = await fetch("/api/mpesa/admin-prompt", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

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
            console.error("Admin prompt error:", error);
            set({ error: error.message || "Failed to initiate payment" });
        } finally {
            set({ isLoading: false });
        }
    },
```

- [ ] **Step 2: Remove `senderId` from `initiatePayment` payload**

In `initiatePayment` (lines 31-37), change the payload to drop `senderId` (the backend now derives it from the JWT):

```js
            const payload = {
                phoneNumber,
                amount: Number(amount), // Ensure amount is a number
                description,
                recipientId,
            };
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build` (from `client/`)
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/store/usePaymentStore.js
git commit -m "feat: add adminPromptPayment action to payment store"
```

---

### Task 5: Client — Add phone field to SignUpPage

**Files:**
- Modify: `client/src/pages/SignUpPage.jsx`

**Interfaces:**
- Consumes: `signup(formData)` from `useAuthStore` (posts to `/auth/signup`).
- Produces: `formData.phone` sent with signup.

- [ ] **Step 1: Add `phone` to form state**

In `client/src/pages/SignUpPage.jsx`, add `phone: ""` to the `formData` initial state (line 19-24):

```js
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        adminCode: "",
        phone: "",
    });
```

- [ ] **Step 2: Add the phone input field**

Insert this block after the Admin Code form-control (after line 178, before the submit button):

```jsx
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">
                                    Phone Number (optional)
                                </span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="size-5 text-base-content/40" />
                                </div>
                                <input
                                    type="tel"
                                    className={`input input-bordered w-full pl-10`}
                                    placeholder="e.g. 0712345678 (for M-Pesa payments)"
                                    value={formData.phone}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            phone: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
```

- [ ] **Step 3: Import the `Phone` icon**

Change the lucide-react import (lines 3-11) to include `Phone`:

```js
import {
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Mail,
    MessageSquare,
    Phone,
    User,
} from "lucide-react";
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build` (from `client/`)
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/SignUpPage.jsx
git commit -m "feat: add optional phone field to signup page"
```

---

### Task 6: Client — Add phone field to SettingsPage

**Files:**
- Modify: `client/src/pages/SettingsPage.jsx`

**Interfaces:**
- Consumes: `authUser`, `updateProfile`, `isUpdatingProfile` from `useAuthStore`.
- Produces: A phone form that calls `updateProfile({ phone })`.

- [ ] **Step 1: Add auth store usage and phone state**

In `client/src/pages/SettingsPage.jsx`, add imports and state at the top of the component (after line 15):

```jsx
import { useAuthStore } from "../store/useAuthStore";

const SettingsPage = () => {
    const { theme, setTheme } = useThemeStore();
    const { authUser, updateProfile, isUpdatingProfile } = useAuthStore();
    const [phone, setPhone] = useState(authUser?.phone || "");
```

Add `useState` to the React import (line 1):

```jsx
import React, { useState } from "react";
```

- [ ] **Step 2: Add the phone form section**

Insert this block at the top of the `space-y-6` div (after line 20, before the Theme section):

```jsx
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold">M-Pesa Phone Number</h2>
                    <p className="text-sm text-base-content/70">
                        Used by the admin to send you M-Pesa Express payment
                        prompts.
                    </p>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        updateProfile({ phone });
                    }}
                    className="flex items-end gap-2"
                >
                    <div className="form-control flex-1">
                        <label className="label">
                            <span className="label-text font-medium">
                                Phone Number
                            </span>
                        </label>
                        <input
                            type="tel"
                            className="input input-bordered w-full"
                            placeholder="e.g. 0712345678"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isUpdatingProfile}
                    >
                        {isUpdatingProfile ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            "Save"
                        )}
                    </button>
                </form>
```

- [ ] **Step 3: Import `Loader2`**

Change the lucide-react import (line 4) to:

```jsx
import { Send, Loader2 } from "lucide-react";
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build` (from `client/`)
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/SettingsPage.jsx
git commit -m "feat: add M-Pesa phone number field to settings page"
```

---

### Task 7: Client — Create AdminPromptModal and AdminPromptButton

**Files:**
- Create: `client/src/components/AdminPromptModal.jsx`
- Create: `client/src/components/AdminPromptButton.jsx`

**Interfaces:**
- Consumes: `useChatStore.selectedUser`, `usePaymentStore.adminPromptPayment` + status state.
- Produces: `AdminPromptButton` (renders "M-Pesa Express" button, opens `AdminPromptModal`); `AdminPromptModal` (shows user name + phone, amount + description form, status states).

- [ ] **Step 1: Create `AdminPromptModal.jsx`**

Create `client/src/components/AdminPromptModal.jsx`:

```jsx
// src/components/AdminPromptModal.jsx
import React, { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { usePaymentStore } from "../store/usePaymentStore";
import { useChatStore } from "../store/useChatStore";

const AdminPromptModal = ({ isOpen, onClose }) => {
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("Payment for products");

    const { selectedUser } = useChatStore();
    const {
        adminPromptPayment,
        isLoading,
        checkoutRequestID,
        transactionStatus,
        error,
        resetPaymentState,
    } = usePaymentStore();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!amount || !description) return;

        await adminPromptPayment(selectedUser?._id, Number(amount), description);
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
                    <h2 className="text-lg font-semibold">M-Pesa Express</h2>
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
                            <div className="bg-base-200 rounded-lg p-3">
                                <p className="text-sm font-medium">
                                    {selectedUser?.fullName}
                                </p>
                                <p className="text-xs text-base-content/70">
                                    {selectedUser?.phone ||
                                        "No phone number on file"}
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
                                    disabled={isLoading || !selectedUser?.phone}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="size-4" />
                                            Send M-Pesa Prompt
                                        </>
                                    )}
                                </button>
                                {!selectedUser?.phone && (
                                    <p className="text-xs text-error mt-2 text-center">
                                        This user has no phone number on file.
                                        Ask them to add one in Settings.
                                    </p>
                                )}
                            </div>
                        </form>
                    ) : (
                        <div className="py-6 text-center">
                            {transactionStatus === "pending" && (
                                <div className="space-y-4">
                                    <Loader2 className="size-12 animate-spin mx-auto text-primary" />
                                    <h3 className="text-lg font-medium">
                                        Payment Prompt Sent
                                    </h3>
                                    <p className="text-base-content/70">
                                        Waiting for the user to approve on their
                                        phone.
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
                                        The user has completed the payment.
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
                                            "There was an error processing the payment."}
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

export default AdminPromptModal;
```

- [ ] **Step 2: Create `AdminPromptButton.jsx`**

Create `client/src/components/AdminPromptButton.jsx`:

```jsx
// src/components/AdminPromptButton.jsx
import React, { useState } from "react";
import { Smartphone } from "lucide-react";
import AdminPromptModal from "./AdminPromptModal";

const AdminPromptButton = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-sm btn-ghost gap-2"
                aria-label="Send M-Pesa Express prompt"
            >
                <Smartphone className="size-4" />
                <span className="hidden sm:inline">M-Pesa Express</span>
            </button>

            <AdminPromptModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};

export default AdminPromptButton;
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build` (from `client/`)
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/AdminPromptModal.jsx client/src/components/AdminPromptButton.jsx
git commit -m "feat: add admin M-Pesa Express prompt modal and button"
```

---

### Task 8: Client — Role-based payment button swap in chat UI

**Files:**
- Modify: `client/src/components/ChatHeader.jsx`
- Modify: `client/src/components/PaymentButton.jsx`
- Modify: `client/src/components/MessageInput.jsx`

**Interfaces:**
- Consumes: `useAuthStore.authUser` (role), `AdminPromptButton`, `PaymentButton`.
- Produces: Admin sees "M-Pesa Express" in chat header; regular users see "Pay with Till"; admins no longer see the credit-card button in the message input.

- [ ] **Step 1: Update `ChatHeader.jsx` for role-based swap**

In `client/src/components/ChatHeader.jsx`:
- Change the import (line 6) to also import `AdminPromptButton` and `useAuthStore`:

```jsx
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import PaymentButton from "./PaymentButton";
import AdminPromptButton from "./AdminPromptButton";
```

- Change the component body (line 9-11) to read `authUser`:

```jsx
const ChatHeader = () => {
    const { selectedUser, setSelectedUser } = useChatStore();
    const { onlineUsers, authUser } = useAuthStore();
```

- Change the Actions block (lines 40-42) to swap by role:

```jsx
                {/* Actions */}
                <div className="flex items-center gap-1">
                    {authUser?.role === "admin" ? (
                        <AdminPromptButton />
                    ) : (
                        <PaymentButton />
                    )}

                    {/* Close button */}
                    <button
                        onClick={() => setSelectedUser(null)}
                        className="p-1.5 hover:bg-base-200 rounded-full"
                    >
                        <X className="size-4 sm:size-5" />
                    </button>
                </div>
```

- [ ] **Step 2: Relabel `PaymentButton` to "Pay with Till"**

In `client/src/components/PaymentButton.jsx`, change the button label (line 17):

```jsx
                <span className="hidden sm:inline">Pay with Till</span>
```

- [ ] **Step 3: Hide the credit-card button for admins in `MessageInput.jsx`**

In `client/src/components/MessageInput.jsx`:
- Add `useAuthStore` import (after line 6):

```jsx
import { useAuthStore } from "../store/useAuthStore";
```

- Read `authUser` in the component (after line 12):

```jsx
    const { authUser } = useAuthStore();
```

- Wrap the credit-card button (lines 91-98) in a role check:

```jsx
                {authUser?.role !== "admin" && (
                    <button
                        type="button"
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="btn btn-sm btn-ghost p-1"
                        aria-label="Send payment"
                    >
                        <CreditCard size={22} />
                    </button>
                )}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build` (from `client/`)
Expected: build succeeds.

- [ ] **Step 5: Manual verification**

With backend + client running:
1. Log in as a **regular user** → open DM with admin → header shows **"Pay with Till"**; message input shows the credit-card button.
2. Log in as the **admin** → open DM with a user → header shows **"M-Pesa Express"**; message input does **not** show the credit-card button.
3. As admin, click "M-Pesa Express" → modal shows the user's name + phone → enter amount → submit → STK push sent to the user's phone (sandbox: approve via the STK Push Simulator) → callback completes → modal shows success.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ChatHeader.jsx client/src/components/PaymentButton.jsx client/src/components/MessageInput.jsx
git commit -m "feat: role-based payment button swap in chat UI"
```

---

## Self-Review Checklist

- **Spec coverage:**
  - ✅ Phone on user profile (Task 1, 5, 6)
  - ✅ Harden `/initiate` with auth (Task 2)
  - ✅ Admin-only `/admin-prompt` reading phone from DB (Task 2)
  - ✅ Phone in sidebar users (Task 3)
  - ✅ `adminPromptPayment` store action (Task 4)
  - ✅ AdminPromptModal + button (Task 7)
  - ✅ Role-based swap: admin → M-Pesa Express, user → Pay with Till (Task 8)
  - ✅ Hide credit-card button for admin (Task 8)
- **Placeholder scan:** No TBD/TODO; every step has concrete code or commands.
- **Type consistency:** `adminPromptPayment(recipientId, amount, description)` matches the store action in Task 4 and the modal call in Task 7. `POST /api/mpesa/admin-prompt` body `{ recipientId, amount, description }` matches between Task 2 (backend) and Task 4 (client). `phone` field name consistent across model, controller, and client.