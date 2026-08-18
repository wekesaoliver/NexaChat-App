# NexaChat Ecommerce Community Redesign — Design

**Date**: 2026-08-18
**Status**: Approved by user (sections 1–4)

## Overview

Redesign NexaChat from a general 1-on-1 chat app into an **admin-driven community hub** connected to the owner's ecommerce website. The admin broadcasts posts about new stock/collections to all logged-in users. Users can like posts, reply to posts via DM to the admin, and freely message the admin. Users can see all members with online/offline status but can only DM the admin. Posts are persistent and visible to new users. Only the admin can delete posts; users can delete their own messages; the admin can delete any message and edit posts.

## Approach

**Extend the existing app** (Approach A). Reuse the working Express/MongoDB/Socket.io backend and React/Vite/Tailwind/Zustand client. Preserve M-Pesa payments, profiles, and settings. No new frameworks.

## Requirements Summary

1. **Ecommerce connection**: A "Visit Store" link/button in the navbar and on posts. URL configurable via `STORE_URL` env var. No product data sync.
2. **Admin role**: `role` field on the User model (`"user" | "admin"`, default `"user"`). Admin account created via `ADMIN_SIGNUP_CODE` env var at signup.
3. **Broadcast posts**: Admin creates/edits/deletes posts (text, images, price, store link). All logged-in users see them in real time. Posts persist for all users including new joiners.
4. **Likes**: Any logged-in user can like/unlike a post (toggle). Like counts update in real time.
5. **Messaging restriction**: Non-admin users may only DM the admin. The admin may DM anyone. Backend-enforced.
6. **Reply to post**: "Reply" button on a post opens the DM chat with the admin, pre-filled with `Re: [post title] — ...` (freely editable). Users can also send the admin any message.
7. **Presence**: All users see all members + admin with online/offline status (existing Socket.io presence).
8. **Deletion rules**: Admin can delete any post and any message, and edit posts. Regular users can delete only their own messages.
9. **Cleanup**: Delete the duplicate `frontend/` directory; keep `client/` as the single frontend.

## Data Model

### User (modified)

Add to existing schema:

```
role: { type: String, enum: ["user", "admin"], default: "user" }
```

### Post (new)

```
Post {
  authorId: ObjectId → User (the admin)
  title: String (required)  // e.g. "New Summer Collection"
  text: String (optional)
  images: [String] (Cloudinary URLs, optional)
  price: Number (optional)
  storeLink: String (optional)
  likes: [ObjectId → User]
  timestamps
}
```

### Message (unchanged)

Existing schema stays as-is. Access is restricted at the controller level.

## Backend API

### Posts routes (`/api/posts`)

| Method | Route | Who | Purpose |
|--------|-------|-----|---------|
| GET | `/api/posts` | Any logged-in user | Fetch all posts, newest first |
| POST | `/api/posts` | Admin only | Create a broadcast post |
| PUT | `/api/posts/:id` | Admin only | Edit a post |
| DELETE | `/api/posts/:id` | Admin only | Delete a post |
| POST | `/api/posts/:id/like` | Any logged-in user | Toggle like/unlike |

### Messages routes (modified)

- `sendMessage`: non-admin may only send to the admin; admin may send to anyone.
- `getMessages`: non-admin may only fetch their conversation with the admin; admin may fetch any conversation.
- `getUsersForSidebar`: everyone sees all users + admin with online/offline. Non-admin users can only open the admin's chat; the admin can open anyone's.
- New `DELETE /api/messages/:id`: admin can delete any message; a regular user can delete only their own messages.

### Middleware

- New `requireAdmin` middleware: checks `req.user.role === "admin"`, else 403.

### Environment variables

- `STORE_URL` — the ecommerce store URL used by the "Visit Store" button.
- `ADMIN_SIGNUP_CODE` — if provided during signup, the account becomes admin.

## Real-Time (Socket.io)

- `newPost` — broadcast to all connected users on post create/edit/delete.
- `postLiked` — broadcast like-count updates.
- Existing `getOnlineUsers` presence stays as-is.

## Frontend (client/)

1. **Posts/Feed page** (`/posts`) — main landing view after login:
   - Post cards: title, text, images, price tag, "Visit Store" button, like button with count, "Reply" button.
   - Admin sees a "Create Post" composer and edit/delete buttons on each post.
   - Users see like + reply buttons only.
   - "Reply" opens the DM chat with the admin, pre-filled with `Re: [post title] — ...`.
2. **Sidebar** — all users + admin with online/offline dots. Non-admin users can only click the admin; the admin can click anyone.
3. **Navbar** — "Visit Store" button (from `STORE_URL`) and a link to the Posts feed.
4. **MessageInput** — supports pre-filled reply text.
5. **Message deletion** — delete button on own messages (users) and on any message (admin).

## Admin Setup Flow

1. Set `ADMIN_SIGNUP_CODE` in `.env`.
2. Sign up with the code → account becomes admin.
3. Log in → admin sees composer + edit/delete controls.
4. Regular users sign up without the code → role `user`.

## Cleanup

- Delete `frontend/` directory.
- Add `STORE_URL` and `ADMIN_SIGNUP_CODE` to `.env.example` and backend config.

## Testing

- Backend: role enforcement (non-admin cannot create/delete posts, cannot DM other users), like toggle, message deletion rules.
- Frontend: feed loads for new users, real-time post updates, reply pre-fill, online/offline display.
- End-to-end: M-Pesa, profiles, and settings still work.

## Out of Scope (YAGNI)

- Public comments on posts.
- Product data sync from the store.
- Push notifications.
- Group chat between users.