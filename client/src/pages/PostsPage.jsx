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
                    key={editingPost?._id ?? "new"}
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
