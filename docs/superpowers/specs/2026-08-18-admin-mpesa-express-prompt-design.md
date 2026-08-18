# Design: Admin M-Pesa Express Prompt + Role-Based Payment UI

**Date**: 2026-08-18
**Status**: Approved
**Approach**: B — Dedicated admin-prompt endpoint

## Overview

Redesign the payment layout so that:

1. **Regular (logged-in) users** see a "Pay with Till" option when they open a direct message with the admin.
2. **The admin** sees an "M-Pesa Express" option in a user's DM that sends a **real STK push** to the user's phone, prompting them to pay an amount the admin enters.

The chat page is already login-gated and non-admin users can only DM the admin, so "only logged-in users see the pay option" is structurally satisfied. The work is: role-based button swap in the chat header, a phone field on user profiles, a new authorized admin-prompt endpoint, and hardening the existing initiate endpoint.

## Backend Changes

### 1. User model (`backend/src/models/user.model.js`)
- Add `phone` field: `String`, optional, default `""`.

### 2. Auth controller (`backend/src/controllers/auth.controller.js`)
- `signup`: accept optional `phone`.
- `updateProfile`: accept `phone` so users can add/change it in Settings.

### 3. M-Pesa routes (`backend/src/routes/mpesa.js`)
- **Harden `/initiate`**: add `protectRoute` middleware. `senderId` comes from `req.user._id` (the authenticated user) instead of the request body — closes the spoofing gap.
- **New `POST /api/mpesa/admin-prompt`** with `protectRoute, requireAdmin`:
  - Body: `{ recipientId, amount, description }`
  - Looks up the recipient user; reads their `phone` from the DB (not from the body).
  - If the user has no phone → `400 { success: false, message: "User has no phone number on file" }`.
  - Calls `initiateSTKPush(recipient.phone, amount, description)`.
  - Creates `Transaction` with `senderId = recipientId` (the payer) and `recipientId = req.user._id` (the admin).
  - Emits `payment_initiated` to the admin; returns the same shape as `/initiate`.

### 4. Sidebar users endpoint (`backend/src/controllers/message.controller.js`)
- Include `phone` in the `getUsersForSidebar` response so the admin's modal can display the user's phone.

## Client Changes

### 1. SignUpPage
- Add optional "Phone number (for M-Pesa)" field, sent with signup.

### 2. SettingsPage
- Add a phone field so users can add/update their number (calls existing `updateProfile`).

### 3. ChatHeader — role-based button swap
- **Admin** viewing a user's DM → shows **"M-Pesa Express"** button (opens new `AdminPromptModal`).
- **Regular user** viewing the admin's DM → shows **"Pay with Till"** button (existing `PaymentModal`, relabeled from "Pay").
- The swap uses `authUser.role === "admin"` — same pattern already used in `Sidebar.jsx`.

### 4. MessageInput
- Hide the credit-card payment button for admins (admin shouldn't pay the user; they use M-Pesa Express instead).

### 5. New component `AdminPromptModal`
- Shows the selected user's name + phone (from the sidebar user object).
- Fields: **Amount (KES)** and **Description**.
- Submit → `POST /api/mpesa/admin-prompt` with `{ recipientId, amount, description }`.
- Status states mirroring `PaymentModal`: pending (spinner), completed (success + close), failed (error + try again).

### 6. `usePaymentStore`
- Add `adminPromptPayment(recipientId, amount, description)` action (same polling pattern as `initiatePayment`).

## Data Flow

### Regular user pays admin (existing, hardened)
1. User opens DM with admin → sees "Pay with Till" → enters phone/amount/description.
2. `POST /api/mpesa/initiate` (now auth-protected, `senderId = req.user._id`).
3. STK push → user approves on phone → callback → transaction `completed` → chat message + socket event.

### Admin prompts user (new)
1. Admin opens DM with user → sees "M-Pesa Express" → modal shows user's phone (from DB).
2. Admin enters amount + description → `POST /api/mpesa/admin-prompt` (admin-only).
3. Backend reads user's phone from DB → STK push sent to **user's** phone.
4. User approves on their phone → callback → transaction `completed` → chat message + socket event to admin.

## Error Handling

- User has no phone on file → `400` with clear message shown in the modal.
- Non-admin calls `admin-prompt` → `403` (requireAdmin).
- Unauthenticated `/initiate` → `401` (protectRoute).
- M-Pesa API failures → existing error path (modal shows failure state).

## Testing

- Backend: unit-test the new `admin-prompt` validation (missing phone, non-admin → 403, invalid recipient → 404).
- Manual sandbox test: admin prompts a test user → STK push arrives → approve via simulator → callback completes.

## Out of Scope (YAGNI)

- No payment-method selector (Till/PayBill stays env-config).
- No changes to the payment-request flow.
- No product-picker pre-fill.