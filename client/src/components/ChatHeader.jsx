"use client";

import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
    const { selectedUser, setSelectedUser } = useChatStore();
    const { onlineUsers } = useAuthStore();

    return (
        <div className="p-2 sm:p-2.5 border-b border-base-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Avatar */}
                    <div className="avatar">
                        <div className="size-8 sm:size-10 rounded-full relative">
                            <img
                                src={selectedUser.profilePic || "/avatar.png"}
                                alt={selectedUser.fullName}
                            />
                        </div>
                    </div>

                    {/* User info */}
                    <div>
                        <h3 className="font-medium text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">
                            {selectedUser.fullName}
                        </h3>
                        <p className="text-xs sm:text-sm text-base-content/70">
                            {onlineUsers.includes(selectedUser._id)
                                ? "Online"
                                : "Offline"}
                        </p>
                    </div>
                </div>

                {/* Close button */}
                <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1.5 hover:bg-base-200 rounded-full"
                >
                    <X className="size-4 sm:size-5" />
                </button>
            </div>
        </div>
    );
};
export default ChatHeader;
