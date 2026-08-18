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
