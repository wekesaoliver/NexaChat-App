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
