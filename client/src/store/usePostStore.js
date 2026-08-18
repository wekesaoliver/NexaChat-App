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
