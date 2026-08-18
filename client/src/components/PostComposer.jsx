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
