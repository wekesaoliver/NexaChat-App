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