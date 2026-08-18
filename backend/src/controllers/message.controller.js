import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { canSendMessage, canGetMessages, canDeleteMessage } from "../lib/permissions.js";

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUser = req.user._id;
        const filteredUsers = await User.find({
            _id: { $ne: loggedInUser },
        }).select("-password");
        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error in getUsersForSidebar:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

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
