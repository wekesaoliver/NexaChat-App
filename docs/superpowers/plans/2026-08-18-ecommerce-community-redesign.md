# Ecommerce Community Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn NexaChat into an admin-driven community hub where the admin broadcasts persistent posts (new stock/collections) to all users, users can like posts and DM the admin only, and presence/online status is visible to everyone.

**Architecture:** Extend the existing Express/MongoDB/Socket.io backend and React/Vite/Tailwind/Zustand client. Add a `role` field to users, a new `Post` model + REST API, backend-enforced messaging restrictions (non-admin users may only DM the admin), a Posts feed page, and a config endpoint exposing the store URL. Keep M-Pesa, profiles, and settings intact. Delete the duplicate `frontend/` directory.

**Tech Stack:** Node.js, Express, MongoDB/Mongoose, Socket.io, React 19, Vite, Tailwind CSS, Zustand, Cloudinary, Node's built-in `node:test` runner (no new dependencies).

## Global Constraints

- Follow `.opencode/context/core/standards/code-quality.md`: pure functions, immutability, small functions (< 50 lines), explicit dependencies, no mutation.
- Follow `.opencode/context/core/standards/security-patterns.md`: validate input at boundaries, use env vars for secrets, never expose internal error details, principle of least privilege.
- Follow `.opencode/context/development/principles/api-design.md`: resource-based URLs, standard HTTP status codes (400/401/403/404/500), consistent error shape `{ error: "message" }`.
- Backend uses ESM (`"type": "module"` in `backend/package.json`). All imports use `.js` extensions.
- Frontend is React 19 + Vite + Tailwind + daisyUI + Zustand. Components use `"use client"` directive where present.
- No new npm dependencies. Tests use Node's built-in `node:test` runner.
- Every task ends with a commit. Commit messages follow the repo style (e.g., `feat: add post model`).
- The existing M-Pesa, profile, and settings features must keep working — do not break them.

---

### Task 1: Backend — Pure permission helpers + tests

**Files:**
- Create: `backend/src/lib/permissions.js`
- Create: `backend/src/lib/permissions.test.js`
- Modify: `backend/package.json` (add `test` script)

**Interfaces:**
- Produces: `isValidAdminCode(code) -> boolean`, `canSendMessage(sender, receiver) -> boolean`, `canGetMessages(currentUser, otherUser) -> boolean`, `canDeleteMessage(currentUser, message) -> boolean`, `toggleLike(likes, userId) -> array`. All pure functions used by Tasks 2–4.

- [ ] **Step 1: Write the failing test**

Create `backend/src/lib/permissions.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    canSendMessage,
    canGetMessages,
    canDeleteMessage,
    isValidAdminCode,
    toggleLike,
} from "./permissions.js";

const admin = { _id: "a1", role: "admin" };
const user = { _id: "u1", role: "user" };
const otherUser = { _id: "u2", role: "user" };

test("canSendMessage: admin can send to anyone", () => {
    assert.equal(canSendMessage(admin, user), true);
    assert.equal(canSendMessage(admin, otherUser), true);
});

test("canSendMessage: non-admin can only send to admin", () => {
    assert.equal(canSendMessage(user, admin), true);
    assert.equal(canSendMessage(user, otherUser), false);
});

test("canGetMessages: admin can view any conversation", () => {
    assert.equal(canGetMessages(admin, user), true);
});

test("canGetMessages: non-admin can only view conversation with admin", () => {
    assert.equal(canGetMessages(user, admin), true);
    assert.equal(canGetMessages(user, otherUser), false);
});

test("canDeleteMessage: admin can delete any message", () => {
    const message = { senderId: "u2" };
    assert.equal(canDeleteMessage(admin, message), true);
});

test("canDeleteMessage: non-admin can delete only own messages", () => {
    const ownMessage = { senderId: "u1" };
    const otherMessage = { senderId: "u2" };
    assert.equal(canDeleteMessage(user, ownMessage), true);
    assert.equal(canDeleteMessage(user, otherMessage), false);
});

test("isValidAdminCode: matches env var", () => {
    process.env.ADMIN_SIGNUP_CODE = "secret123";
    assert.equal(isValidAdminCode("secret123"), true);
    assert.equal(isValidAdminCode("wrong"), false);
    delete process.env.ADMIN_SIGNUP_CODE;
});

test("isValidAdminCode: false when env var not set", () => {
    delete process.env.ADMIN_SIGNUP_CODE;
    assert.equal(isValidAdminCode("anything"), false);
});

test("toggleLike: adds userId when not present", () => {
    const result = toggleLike([], "u1");
    assert.deepEqual(result.map(String), ["u1"]);
});

test("toggleLike: removes userId when present", () => {
    const result = toggleLike(["u1", "u2"], "u1");
    assert.deepEqual(result.map(String), ["u2"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/permissions.test.js` (from `backend/`)
Expected: FAIL with `ERR_MODULE_NOT_FOUND` — `permissions.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/lib/permissions.js`:

```js
export const canSendMessage = (sender, receiver) => {
    if (sender.role === "admin") return true;
    return receiver.role === "admin";
};

export const canGetMessages = (currentUser, otherUser) => {
    if (currentUser.role === "admin") return true;
    return otherUser.role === "admin";
};

export const canDeleteMessage = (currentUser, message) => {
    if (currentUser.role === "admin") return true;
    return String(message.senderId) === String(currentUser._id);
};

export const isValidAdminCode = (code) => {
    if (!process.env.ADMIN_SIGNUP_CODE) return false;
    return code === process.env.ADMIN_SIGNUP_CODE;
};

export const toggleLike = (likes, userId) => {
    const userIdStr = String(userId);
    const hasLiked = likes.some((id) => String(id) === userIdStr);
    if (hasLiked) {
        return likes.filter((id) => String(id) !== userIdStr);
    }
    return [...likes, userId];
};
```

- [ ] **Step 4: Add test script and run tests**

Modify `backend/package.json` scripts:

```json
"scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "node --test"
}
```

Run: `npm test` (from `backend/`)
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/permissions.js backend/src/lib/permissions.test.js backend/package.json
git commit -m "feat: add permission helpers with tests"
```

---

### Task 2: Backend — User role + admin signup + requireAdmin middleware

**Files:**
- Modify: `backend/src/models/user.model.js`
- Modify: `backend/src/controllers/auth.controller.js`
- Modify: `backend/src/middleware/auth.middleware.js`
- Create: `backend/.env.example`

**Interfaces:**
- Consumes: `isValidAdminCode` from Task 1.
- Produces: `requireAdmin` middleware (used by Task 3), `role` field on User (used by Tasks 3–4 and frontend).

- [ ] **Step 1: Add `role` to the User model**

Modify `backend/src/models/user.model.js` — add after `profilePic`:

```js
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },
```

- [ ] **Step 2: Update signup to accept admin code**

Modify `backend/src/controllers/auth.controller.js`:

1. Add import at top:
```js
import { isValidAdminCode } from "../lib/permissions.js";
```

2. Change the destructure line:
```js
  const { fullName, email, password, adminCode } = req.body;
```

3. Change the `new User` construction:
```js
    const role = isValidAdminCode(adminCode) ? "admin" : "user";

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      role,
    });
```

4. Add `role` to the signup response:
```js
      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
        role: newUser.role,
      });
```

5. Add `role` to the login response:
```js
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      role: user.role,
    });
```

(`checkAuth` already returns `req.user` which includes `role` automatically.)

- [ ] **Step 3: Add `requireAdmin` middleware**

Modify `backend/src/middleware/auth.middleware.js` — append at the end:

```js
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden - Admin access required" });
  }
  next();
};
```

- [ ] **Step 4: Create `.env.example`**

Create `backend/.env.example`:

```
PORT=5001
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_PASSKEY=your_mpesa_passkey
MPESA_SHORTCODE=your_mpesa_shortcode
MPESA_ENV=sandbox
MPESA_CALLBACK_URL=your_callback_url
STORE_URL=https://yourstore.com
ADMIN_SIGNUP_CODE=your_secret_admin_code
```

- [ ] **Step 5: Verify**

Run: `npm test` (from `backend/`)
Expected: PASS (existing tests still green).

Run: `node -e "import('./src/models/user.model.js').then(() => console.log('model ok'))"` (from `backend/`)
Expected: `model ok` (schema compiles).

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/user.model.js backend/src/controllers/auth.controller.js backend/src/middleware/auth.middleware.js backend/.env.example
git commit -m "feat: add user roles and admin signup code"
```

---

### Task 3: Backend — Post model + posts API + socket events

**Files:**
- Create: `backend/src/models/post.model.js`
- Create: `backend/src/controllers/post.controller.js`
- Create: `backend/src/routes/post.route.js`
- Modify: `backend/src/index.js`

**Interfaces:**
- Consumes: `requireAdmin` (Task 2), `toggleLike` (Task 1), `io` from `../lib/socket.js`.
- Produces: REST endpoints `GET/POST /api/posts`, `PUT/DELETE /api/posts/:id`, `POST /api/posts/:id/like`; socket events `newPost` and `postLiked` (consumed by frontend Task 7).

- [ ] **Step 1: Create the Post model**

Create `backend/src/models/post.model.js`:

```js
import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
    {
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        text: {
            type: String,
            default: "",
        },
        images: {
            type: [String],
            default: [],
        },
        price: {
            type: Number,
        },
        storeLink: {
            type: String,
            default: "",
        },
        likes: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "User",
            default: [],
        },
    },
    { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
```

- [ ] **Step 2: Create the post controller**

Create `backend/src/controllers/post.controller.js`:

```js
import Post from "../models/post.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";
import { toggleLike } from "../lib/permissions.js";

export const getPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        console.error("Error in getPosts:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const createPost = async (req, res) => {
    try {
        const { title, text, price, storeLink, images } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Title is required" });
        }

        let imageUrls = [];
        if (Array.isArray(images) && images.length > 0) {
            const uploads = await Promise.all(
                images.map((img) => cloudinary.uploader.upload(img))
            );
            imageUrls = uploads.map((u) => u.secure_url);
        }

        const newPost = new Post({
            authorId: req.user._id,
            title: title.trim(),
            text: text?.trim() || "",
            price: price ? Number(price) : undefined,
            storeLink: storeLink?.trim() || "",
            images: imageUrls,
        });

        await newPost.save();
        io.emit("newPost", { action: "create", post: newPost });
        res.status(201).json(newPost);
    } catch (error) {
        console.error("Error in createPost:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, text, price, storeLink, images } = req.body;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: "Post not found" });

        let imageUrls = post.images;
        if (Array.isArray(images) && images.length > 0) {
            const uploads = await Promise.all(
                images.map((img) => cloudinary.uploader.upload(img))
            );
            imageUrls = uploads.map((u) => u.secure_url);
        }

        post.title = title?.trim() || post.title;
        post.text = text?.trim() ?? post.text;
        post.price = price !== undefined ? Number(price) : post.price;
        post.storeLink = storeLink?.trim() ?? post.storeLink;
        post.images = imageUrls;

        await post.save();
        io.emit("newPost", { action: "update", post });
        res.status(200).json(post);
    } catch (error) {
        console.error("Error in updatePost:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByIdAndDelete(id);
        if (!post) return res.status(404).json({ error: "Post not found" });
        io.emit("newPost", { action: "delete", postId: id });
        res.status(200).json({ message: "Post deleted" });
    } catch (error) {
        console.error("Error in deletePost:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const togglePostLike = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: "Post not found" });

        post.likes = toggleLike(post.likes, req.user._id);
        await post.save();

        io.emit("postLiked", { postId: post._id, likes: post.likes });
        res.status(200).json(post);
    } catch (error) {
        console.error("Error in togglePostLike:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
```

- [ ] **Step 3: Create the post routes**

Create `backend/src/routes/post.route.js`:

```js
import express from "express";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import {
    getPosts,
    createPost,
    updatePost,
    deletePost,
    togglePostLike,
} from "../controllers/post.controller.js";

const router = express.Router();

router.get("/", protectRoute, getPosts);
router.post("/", protectRoute, requireAdmin, createPost);
router.put("/:id", protectRoute, requireAdmin, updatePost);
router.delete("/:id", protectRoute, requireAdmin, deletePost);
router.post("/:id/like", protectRoute, togglePostLike);

export default router;
```

- [ ] **Step 4: Register the routes**

Modify `backend/src/index.js`:

1. Add import after the mpesaTestRoutes import:
```js
import postRoutes from "./routes/post.route.js";
```

2. Add after the payment-requests line:
```js
app.use("/api/posts", postRoutes);
```

- [ ] **Step 5: Verify**

Run: `node -e "import('./src/models/post.model.js').then(() => console.log('post model ok'))"` (from `backend/`)
Expected: `post model ok`

Run: `npm test` (from `backend/`)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/post.model.js backend/src/controllers/post.controller.js backend/src/routes/post.route.js backend/src/index.js
git commit -m "feat: add posts API with admin-only write access"
```

---

### Task 4: Backend — Messaging restrictions + message deletion

**Files:**
- Modify: `backend/src/controllers/message.controller.js`
- Modify: `backend/src/routes/message.route.js`

**Interfaces:**
- Consumes: `canSendMessage`, `canGetMessages`, `canDeleteMessage` from Task 1.
- Produces: `DELETE /api/messages/:id` endpoint (consumed by frontend Task 8).

- [ ] **Step 1: Add permission checks to message controllers**

Modify `backend/src/controllers/message.controller.js`:

1. Add import:
```js
import { canSendMessage, canGetMessages, canDeleteMessage } from "../lib/permissions.js";
```

2. Replace `getMessages` with:
```js
export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        const otherUser = await User.findById(userToChatId);
        if (!otherUser) return res.status(404).json({ error: "User not found" });
        if (!canGetMessages(req.user, otherUser)) {
            return res
                .status(403)
                .json({ error: "You can only view your conversation with the admin" });
        }

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId },
            ],
        });
        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
```

3. Replace `sendMessage` with:
```js
export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        const receiver = await User.findById(receiverId);
        if (!receiver) return res.status(404).json({ error: "User not found" });
        if (!canSendMessage(req.user, receiver)) {
            return res.status(403).json({ error: "You can only message the admin" });
        }

        let imageUrl;
        if (image) {
            //upload base64 image to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        await newMessage.save();

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessage controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
```

4. Append `deleteMessage` at the end:
```js
export const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Message.findById(id);
        if (!message) return res.status(404).json({ error: "Message not found" });
        if (!canDeleteMessage(req.user, message)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        await Message.findByIdAndDelete(id);
        res.status(200).json({ message: "Message deleted" });
    } catch (error) {
        console.log("Error in deleteMessage controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
```

- [ ] **Step 2: Add the delete route**

Modify `backend/src/routes/message.route.js`:

1. Update the import:
```js
import { getUsersForSidebar, getMessages, sendMessage, deleteMessage } from '../controllers/message.controller.js';
```

2. Add the delete route:
```js
router.delete("/:id", protectRoute, deleteMessage);
```

- [ ] **Step 3: Verify**

Run: `npm test` (from `backend/`)
Expected: PASS.

Run: `node -e "import('./src/controllers/message.controller.js').then(() => console.log('controller ok'))"` (from `backend/`)
Expected: `controller ok`

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/message.controller.js backend/src/routes/message.route.js
git commit -m "feat: restrict messaging to admin-only DMs and add message deletion"
```

---

### Task 5: Backend — Config endpoint for store URL

**Files:**
- Create: `backend/src/routes/config.route.js`
- Modify: `backend/src/index.js`

**Interfaces:**
- Produces: `GET /api/config` → `{ storeUrl: string }` (consumed by frontend Task 8 Navbar).

- [ ] **Step 1: Create the config route**

Create `backend/src/routes/config.route.js`:

```js
import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).json({ storeUrl: process.env.STORE_URL || "" });
});

export default router;
```

- [ ] **Step 2: Register the route**

Modify `backend/src/index.js`:

1. Add import:
```js
import configRoutes from "./routes/config.route.js";
```

2. Add after the posts line:
```js
app.use("/api/config", configRoutes);
```

- [ ] **Step 3: Verify**

Run: `node -e "import('./src/routes/config.route.js').then(() => console.log('config route ok'))"` (from `backend/`)
Expected: `config route ok`

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/config.route.js backend/src/index.js
git commit -m "feat: add config endpoint for store URL"
```

---

### Task 6: Frontend — Admin code on signup

**Files:**
- Modify: `client/src/pages/SignUpPage.jsx`
- Modify: `client/src/store/useAuthStore.js`

**Interfaces:**
- Consumes: backend `POST /api/auth/signup` now accepts `adminCode`.
- Produces: `authUser.role` available in the auth store (consumed by Tasks 7–8).

- [ ] **Step 1: Add admin code field to SignUpPage**

Modify `client/src/pages/SignUpPage.jsx`:

1. Add `adminCode: ""` to the `formData` state:
```js
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        adminCode: "",
    });
```

2. Add the admin code input after the password field (before the submit button). Insert this block after the password `</div>` closing tag (the one containing the show/hide password button):

```jsx
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">
                                    Admin Code (optional)
                                </span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="size-5 text-base-content/40" />
                                </div>
                                <input
                                    type="password"
                                    className={`input input-bordered w-full pl-10`}
                                    placeholder="Only for the store admin"
                                    value={formData.adminCode}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            adminCode: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
```

(`Lock` is already imported in SignUpPage.jsx.)

- [ ] **Step 2: Verify signup passes adminCode through**

`client/src/store/useAuthStore.js` `signup` already posts the whole `data` object to `/auth/signup`, so no change is needed there. Confirm by reading the file — the `signup` action calls `axiosInstance.post("/auth/signup", data)`.

- [ ] **Step 3: Verify**

Run: `npm run lint` (from `client/`)
Expected: PASS (no new lint errors).

Run: `npm run build` (from `client/`)
Expected: PASS (build succeeds).

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/SignUpPage.jsx
git commit -m "feat: add admin code field to signup"
```

---

### Task 7: Frontend — Post store + Posts feed page

**Files:**
- Modify: `client/src/store/useChatStore.js`
- Create: `client/src/store/usePostStore.js`
- Create: `client/src/pages/PostsPage.jsx`
- Create: `client/src/components/PostCard.jsx`
- Create: `client/src/components/PostComposer.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: backend `/api/posts` endpoints and socket events `newPost`, `postLiked`.
- Produces: `usePostStore` with `posts`, `getPosts`, `createPost`, `updatePost`, `deletePost`, `toggleLike`, `subscribeToPosts`, `unsubscribeFromPosts`. Also produces `replyDraft`, `setReplyDraft`, `clearReplyDraft`, `deleteMessage` in `useChatStore` (consumed by Task 8). `PostsPage` at route `/`.

- [ ] **Step 1: Add reply draft + deleteMessage to the chat store**

Modify `client/src/store/useChatStore.js`:

1. Add `replyDraft` state and actions. Insert after `setSelectedUser`:
```js
    /* TODO */
    setSelectedUser: (selectedUser) => set({ selectedUser }),

    replyDraft: "",
    setReplyDraft: (text) => set({ replyDraft: text }),
    clearReplyDraft: () => set({ replyDraft: "" }),

    deleteMessage: async (messageId) => {
        try {
            await axiosInstance.delete(`/messages/${messageId}`);
            set({
                messages: get().messages.filter((m) => m._id !== messageId),
            });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete message");
        }
    },
}));
```

- [ ] **Step 2: Create the post store**

Create `client/src/store/usePostStore.js`:

```js
import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";

export const usePostStore = create((set, get) => ({
    posts: [],
    isPostsLoading: false,
    isCreatingPost: false,

    getPosts: async () => {
        set({ isPostsLoading: true });
        try {
            const res = await axiosInstance.get("/posts");
            set({ posts: res.data });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to load posts");
        } finally {
            set({ isPostsLoading: false });
        }
    },

    createPost: async (data) => {
        set({ isCreatingPost: true });
        try {
            const res = await axiosInstance.post("/posts", data);
            set({ posts: [res.data, ...get().posts] });
            toast.success("Post published");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create post");
        } finally {
            set({ isCreatingPost: false });
        }
    },

    updatePost: async (postId, data) => {
        try {
            const res = await axiosInstance.put(`/posts/${postId}`, data);
            set({
                posts: get().posts.map((p) =>
                    p._id === postId ? res.data : p
                ),
            });
            toast.success("Post updated");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update post");
        }
    },

    deletePost: async (postId) => {
        try {
            await axiosInstance.delete(`/posts/${postId}`);
            set({ posts: get().posts.filter((p) => p._id !== postId) });
            toast.success("Post deleted");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete post");
        }
    },

    toggleLike: async (postId) => {
        try {
            const res = await axiosInstance.post(`/posts/${postId}/like`);
            set({
                posts: get().posts.map((p) =>
                    p._id === postId ? res.data : p
                ),
            });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to like post");
        }
    },

    subscribeToPosts: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.on("newPost", ({ action, post, postId }) => {
            if (action === "create") {
                set({
                    posts: [
                        post,
                        ...get().posts.filter((p) => p._id !== post._id),
                    ],
                });
            } else if (action === "update") {
                set({
                    posts: get().posts.map((p) =>
                        p._id === post._id ? post : p
                    ),
                });
            } else if (action === "delete") {
                set({ posts: get().posts.filter((p) => p._id !== postId) });
            }
        });

        socket.on("postLiked", ({ postId, likes }) => {
            set({
                posts: get().posts.map((p) =>
                    p._id === postId ? { ...p, likes } : p
                ),
            });
        });
    },

    unsubscribeFromPosts: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        socket.off("newPost");
        socket.off("postLiked");
    },
}));
```

- [ ] **Step 3: Create the Posts page**

Create `client/src/pages/PostsPage.jsx`:

```jsx
import { useEffect, useState } from "react";
import { usePostStore } from "../store/usePostStore";
import { useAuthStore } from "../store/useAuthStore";
import PostCard from "../components/PostCard";
import PostComposer from "../components/PostComposer";

const PostsPage = () => {
    const {
        posts,
        getPosts,
        isPostsLoading,
        subscribeToPosts,
        unsubscribeFromPosts,
    } = usePostStore();
    const { authUser } = useAuthStore();
    const [editingPost, setEditingPost] = useState(null);

    useEffect(() => {
        getPosts();
        subscribeToPosts();
        return () => unsubscribeFromPosts();
    }, [getPosts, subscribeToPosts, unsubscribeFromPosts]);

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            {authUser?.role === "admin" && (
                <PostComposer
                    editingPost={editingPost}
                    onCancelEdit={() => setEditingPost(null)}
                />
            )}
            {isPostsLoading ? (
                <div className="text-center py-10 text-base-content/60">
                    Loading posts...
                </div>
            ) : posts.length === 0 ? (
                <div className="text-center py-10 text-base-content/60">
                    No posts yet. Check back soon!
                </div>
            ) : (
                posts.map((post) => (
                    <PostCard
                        key={post._id}
                        post={post}
                        onEdit={setEditingPost}
                    />
                ))
            )}
        </div>
    );
};

export default PostsPage;
```

- [ ] **Step 4: Create the PostCard component**

Create `client/src/components/PostCard.jsx`:

```jsx
import { Heart, Reply, Trash2, Pencil, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { usePostStore } from "../store/usePostStore";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatMessageTime } from "../lib/utilis";

const PostCard = ({ post, onEdit }) => {
    const { toggleLike, deletePost } = usePostStore();
    const { authUser } = useAuthStore();
    const { users, getUsers, setSelectedUser, setReplyDraft } = useChatStore();
    const navigate = useNavigate();

    const isAdmin = authUser?.role === "admin";
    const hasLiked = post.likes?.some(
        (id) => String(id) === String(authUser?._id)
    );

    const handleReply = async () => {
        let admin = users.find((u) => u.role === "admin");
        if (!admin) {
            await getUsers();
            admin = useChatStore.getState().users.find(
                (u) => u.role === "admin"
            );
        }
        if (!admin) return toast.error("Admin not found");
        setReplyDraft(`Re: ${post.title} — `);
        setSelectedUser(admin);
        navigate("/chat");
    };

    return (
        <div className="card bg-base-100 shadow-md">
            <div className="card-body">
                <div className="flex items-start justify-between gap-2">
                    <h2 className="card-title">{post.title}</h2>
                    {isAdmin && (
                        <div className="flex gap-1 shrink-0">
                            <button
                                onClick={() => onEdit(post)}
                                className="btn btn-xs btn-ghost"
                                aria-label="Edit post"
                            >
                                <Pencil className="size-4" />
                            </button>
                            <button
                                onClick={() => deletePost(post._id)}
                                className="btn btn-xs btn-ghost text-error"
                                aria-label="Delete post"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    )}
                </div>

                {post.text && <p className="whitespace-pre-wrap">{post.text}</p>}

                {post.images?.length > 0 && (
                    <div className="grid gap-2">
                        {post.images.map((img, i) => (
                            <img
                                key={i}
                                src={img}
                                alt={post.title}
                                className="rounded-lg w-full object-cover max-h-96"
                            />
                        ))}
                    </div>
                )}

                {post.price && (
                    <div className="text-lg font-bold text-primary">
                        KES {post.price.toLocaleString()}
                    </div>
                )}

                <div className="text-xs text-base-content/50">
                    {formatMessageTime(post.createdAt)}
                </div>

                <div className="card-actions justify-between items-center mt-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => toggleLike(post._id)}
                            className={`btn btn-sm ${
                                hasLiked ? "btn-primary" : "btn-ghost"
                            }`}
                        >
                            <Heart className="size-4" />
                            {post.likes?.length || 0}
                        </button>
                        <button
                            onClick={handleReply}
                            className="btn btn-sm btn-ghost"
                        >
                            <Reply className="size-4" /> Reply
                        </button>
                    </div>
                    {post.storeLink && (
                        <a
                            href={post.storeLink}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-outline"
                        >
                            <ExternalLink className="size-4" /> Visit Store
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostCard;
```

- [ ] **Step 5: Create the PostComposer component**

Create `client/src/components/PostComposer.jsx`:

```jsx
import { useState } from "react";
import { X } from "lucide-react";
import { usePostStore } from "../store/usePostStore";

const PostComposer = ({ editingPost, onCancelEdit }) => {
    const { createPost, updatePost, isCreatingPost } = usePostStore();
    const [title, setTitle] = useState(editingPost?.title || "");
    const [text, setText] = useState(editingPost?.text || "");
    const [price, setPrice] = useState(editingPost?.price || "");
    const [storeLink, setStoreLink] = useState(editingPost?.storeLink || "");
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState(
        editingPost?.images || []
    );

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const readers = files.map(
            (file) =>
                new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                })
        );
        Promise.all(readers).then((results) => {
            setImages((prev) => [...prev, ...results]);
            setImagePreviews((prev) => [...prev, ...results]);
        });
    };

    const resetForm = () => {
        setTitle("");
        setText("");
        setPrice("");
        setStoreLink("");
        setImages([]);
        setImagePreviews([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        const payload = {
            title: title.trim(),
            text: text.trim(),
            price: price ? Number(price) : undefined,
            storeLink: storeLink.trim(),
            images: images.length ? images : undefined,
        };

        if (editingPost) {
            await updatePost(editingPost._id, payload);
            onCancelEdit();
        } else {
            await createPost(payload);
        }
        resetForm();
    };

    return (
        <form onSubmit={handleSubmit} className="card bg-base-100 shadow-md">
            <div className="card-body space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                        {editingPost ? "Edit Post" : "Create Post"}
                    </h3>
                    {editingPost && (
                        <button
                            type="button"
                            onClick={onCancelEdit}
                            className="btn btn-xs btn-ghost"
                            aria-label="Cancel edit"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>

                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title (e.g. New Summer Collection)"
                    className="input input-bordered"
                />

                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Description (optional)"
                    className="textarea textarea-bordered"
                    rows={3}
                />

                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        type="number"
                        placeholder="Price (KES, optional)"
                        className="input input-bordered flex-1"
                    />
                    <input
                        value={storeLink}
                        onChange={(e) => setStoreLink(e.target.value)}
                        placeholder="Store link (optional)"
                        className="input input-bordered flex-1"
                    />
                </div>

                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="file-input file-input-bordered"
                />

                {imagePreviews.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        {imagePreviews.map((img, i) => (
                            <img
                                key={i}
                                src={img}
                                alt="preview"
                                className="size-20 object-cover rounded-lg"
                            />
                        ))}
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isCreatingPost || !title.trim()}
                >
                    {editingPost ? "Update Post" : "Publish Post"}
                </button>
            </div>
        </form>
    );
};

export default PostComposer;
```

- [ ] **Step 6: Update routes in App.jsx**

Modify `client/src/App.jsx`:

1. Add import:
```jsx
import PostsPage from "./pages/PostsPage";
```

2. Change the home route and add the chat route:
```jsx
                <Route
                    path="/"
                    element={authUser ? <PostsPage /> : <Navigate to="/login" />}
                />
                <Route
                    path="/chat"
                    element={authUser ? <HomePage /> : <Navigate to="/login" />}
                />
```

- [ ] **Step 7: Verify**

Run: `npm run lint` (from `client/`)
Expected: PASS (no new lint errors).

Run: `npm run build` (from `client/`)
Expected: PASS (build succeeds).

- [ ] **Step 8: Commit**

```bash
git add client/src/store/useChatStore.js client/src/store/usePostStore.js client/src/pages/PostsPage.jsx client/src/components/PostCard.jsx client/src/components/PostComposer.jsx client/src/App.jsx
git commit -m "feat: add posts feed page with likes and reply"
```

---

### Task 8: Frontend — Chat restrictions, reply draft, message deletion, navbar

**Files:**
- Modify: `client/src/components/Sidebar.jsx`
- Modify: `client/src/components/ChatContainer.jsx`
- Modify: `client/src/components/MessageInput.jsx`
- Modify: `client/src/components/Navbar.jsx`

**Interfaces:**
- Consumes: `DELETE /api/messages/:id` (Task 4), `GET /api/config` (Task 5), `authUser.role` (Task 6), `replyDraft`/`setReplyDraft`/`clearReplyDraft`/`deleteMessage` from `useChatStore` (Task 7).

- [ ] **Step 1: Restrict sidebar clicks to admin (for non-admin users)**

Modify `client/src/components/Sidebar.jsx`:

1. Add `Lock` to the lucide import:
```jsx
import { Users, Eye, Lock } from "lucide-react";
```

2. Get `authUser` from the auth store:
```jsx
    const { onlineUsers, authUser } = useAuthStore();
```

3. Replace the `filteredUsers.map((user) => (` block with:
```jsx
                {filteredUsers.map((user) => {
                    const isAdmin = authUser?.role === "admin";
                    const canChat = isAdmin || user.role === "admin";
                    return (
                        <button
                            key={user._id}
                            onClick={() => canChat && setSelectedUser(user)}
                            disabled={!canChat}
                            className={`
                        w-full p-2 sm:p-3 flex flex-col lg:flex-row items-center gap-1 lg:gap-3
                        hover:bg-base-300 transition-colors
                        ${
                            selectedUser?._id === user._id
                                ? "bg-base-300 ring-1 ring-base-300"
                                : ""
                        }
                        ${!canChat ? "opacity-60 cursor-not-allowed" : ""}
                        `}
                        >
                            <div className="relative mx-auto lg:mx-0">
                                <img
                                    src={user.profilePic || "/avatar.png"}
                                    alt={user.name}
                                    className="size-10 sm:size-12 object-cover rounded-full"
                                />
                                {onlineUsers.includes(user._id) && (
                                    <span
                                        className="absolute bottom-0 right-0 size-2 sm:size-3 bg-green-500
                                    rounded-full ring-2 ring-zinc-900"
                                    />
                                )}
                            </div>

                            {/* User info - only visible on larger screens */}
                            <div className="hidden lg:block text-left min-w-0 flex-1">
                                <div className="font-medium truncate flex items-center gap-1">
                                    {user.fullName}
                                    {user.role === "admin" && (
                                        <span className="badge badge-primary badge-xs">
                                            Admin
                                        </span>
                                    )}
                                    {!canChat && (
                                        <Lock className="size-3 text-zinc-500" />
                                    )}
                                </div>
                                <div className="text-sm text-zinc-400">
                                    {onlineUsers.includes(user._id)
                                        ? "Online"
                                        : "Offline"}
                                </div>
                            </div>

                            {/* Small screen name indicator */}
                            <div className="text-xs truncate max-w-full lg:hidden">
                                {user.fullName.split(" ")[0]}
                            </div>
                        </button>
                    );
                })}
```

- [ ] **Step 2: Add delete buttons to messages**

Modify `client/src/components/ChatContainer.jsx`:

1. Add `Trash2` to the lucide import (add a new import line):
```jsx
import { Trash2 } from "lucide-react";
```

2. Get `deleteMessage` from the chat store:
```jsx
    const { addMessage, deleteMessage } = useChatStore();
```

3. In the regular text/image message bubble, add a delete button. Replace the `chat-bubble` div block for regular messages with:
```jsx
                            <div className="chat-bubble flex flex-col max-w-[75vw] sm:max-w-[60vw] md:max-w-[50vw] lg:max-w-[40vw]">
                                {message.image && (
                                    <img
                                        src={
                                            message.image || "/placeholder.svg"
                                        }
                                        alt="Attachment"
                                        className="max-w-full xs:max-w-[150px] sm:max-w-[200px] md:max-w-[250px] rounded-md mb-2"
                                    />
                                )}
                                {message.text && (
                                    <p className="break-words">
                                        {message.text}
                                    </p>
                                )}
                                {(authUser?.role === "admin" ||
                                    message.senderId === authUser._id) && (
                                    <button
                                        onClick={() =>
                                            deleteMessage(message._id)
                                        }
                                        className="self-end mt-1 text-xs opacity-60 hover:opacity-100 hover:text-error"
                                        aria-label="Delete message"
                                    >
                                        <Trash2 className="size-3" />
                                    </button>
                                )}
                            </div>
```

- [ ] **Step 3: Support the reply draft in MessageInput**

Modify `client/src/components/MessageInput.jsx`:

1. Add `useEffect` to the react import:
```jsx
import { useRef, useState, useEffect } from "react";
```

2. Get reply draft from the chat store:
```jsx
    const { selectedUser, sendMessage, replyDraft, clearReplyDraft } =
        useChatStore();
```

3. Initialize text from the draft and clear it on mount:
```jsx
    const [text, setText] = useState(replyDraft || "");

    useEffect(() => {
        if (replyDraft) {
            setText(replyDraft);
            clearReplyDraft();
        }
    }, [replyDraft, clearReplyDraft]);
```

- [ ] **Step 4: Add Visit Store button + Posts/Chat links to Navbar**

Modify `client/src/components/Navbar.jsx`:

1. Update imports:
```jsx
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import {
    LogOut,
    MessageSquare,
    Settings,
    User,
    Store,
    LayoutGrid,
} from "lucide-react";
import { useEffect, useState } from "react";
```

2. Add store URL fetch inside the component:
```jsx
const Navbar = () => {
    const { logout, authUser } = useAuthStore();
    const [storeUrl, setStoreUrl] = useState("");

    useEffect(() => {
        axiosInstance
            .get("/config")
            .then((res) => setStoreUrl(res.data.storeUrl))
            .catch(() => {});
    }, []);
```

3. Add Posts + Chat links next to the logo (inside the first `div` with `flex items-center gap-2 sm:gap-8`), after the logo `Link`:
```jsx
                        <Link
                            to="/"
                            className="btn btn-sm btn-ghost gap-1"
                        >
                            <LayoutGrid className="size-4" />
                            <span className="hidden sm:inline">Posts</span>
                        </Link>
                        <Link
                            to="/chat"
                            className="btn btn-sm btn-ghost gap-1"
                        >
                            <MessageSquare className="size-4" />
                            <span className="hidden sm:inline">Chat</span>
                        </Link>
```

4. Add the Visit Store button before the Settings link:
```jsx
                        {storeUrl && (
                            <a
                                href={storeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-primary gap-1"
                            >
                                <Store className="size-4" />
                                <span className="hidden sm:inline">
                                    Visit Store
                                </span>
                            </a>
                        )}
```

- [ ] **Step 5: Verify**

Run: `npm run lint` (from `client/`)
Expected: PASS (no new lint errors).

Run: `npm run build` (from `client/`)
Expected: PASS (build succeeds).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/Sidebar.jsx client/src/components/ChatContainer.jsx client/src/components/MessageInput.jsx client/src/components/Navbar.jsx
git commit -m "feat: restrict chat to admin DMs, add reply draft and message deletion"
```

---

### Task 9: Cleanup + end-to-end verification

**Files:**
- Delete: `frontend/` (entire directory)
- Modify: `README.md`

**Interfaces:**
- Consumes: all prior tasks.

- [ ] **Step 1: Delete the duplicate frontend directory**

Run: `rm -rf frontend` (from repo root)

Verify: `ls` — `frontend/` is gone, `client/` remains.

- [ ] **Step 2: Update README**

Modify `README.md`:

1. Update the feature list to mention admin broadcast posts, likes, admin-only DMs, and the Visit Store link.
2. Update the folder structure section to remove `frontend/` references (it only lists `backend/` and `client/` already — verify no stale references).
3. Add `STORE_URL` and `ADMIN_SIGNUP_CODE` to the backend setup instructions.

- [ ] **Step 3: Run backend tests**

Run: `npm test` (from `backend/`)
Expected: PASS — all 9 permission tests green.

- [ ] **Step 4: Build the client**

Run: `npm run build` (from `client/`)
Expected: PASS (production build succeeds).

- [ ] **Step 5: Manual end-to-end verification**

With MongoDB running and `.env` configured (set `STORE_URL` and `ADMIN_SIGNUP_CODE`):

1. Start backend: `npm run dev` (from `backend/`)
2. Start client: `npm run dev` (from `client/`)
3. Sign up with the admin code → verify the account is admin (composer visible on `/`).
4. Sign up a second account without the code → verify role is `user`.
5. As admin: create a post with title, text, price, store link, and an image → verify it appears on both accounts' feeds in real time.
6. As user: like the post → verify the count updates on both feeds.
7. As user: click Reply → verify it navigates to `/chat` with the admin selected and `Re: <title> — ` pre-filled.
8. As user: send a message to the admin → verify the admin receives it.
9. As user: verify non-admin users in the sidebar are disabled (lock icon) and only the admin is clickable.
10. As user: delete your own message → verify it disappears.
11. As admin: delete the user's message → verify it disappears for the user.
12. As admin: edit the post → verify the change propagates.
13. As admin: delete the post → verify it disappears for all users.
14. Verify the "Visit Store" button in the navbar opens `STORE_URL`.
15. Verify M-Pesa payment button still works in the chat with the admin.
16. Verify profile and settings pages still work.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove duplicate frontend and update README"
```