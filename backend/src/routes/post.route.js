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
