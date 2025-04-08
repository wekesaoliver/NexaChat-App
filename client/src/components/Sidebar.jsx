"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Eye } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const Sidebar = () => {
    const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } =
        useChatStore();

    const { onlineUsers } = useAuthStore();
    const [showOnlineOnly, setShowOnlineOnly] = useState(false);

    useEffect(() => {
        getUsers();
    }, [getUsers]);

    const filteredUsers = showOnlineOnly
        ? users.filter((user) => onlineUsers.includes(user._id))
        : users;
    if (isUsersLoading) return <SidebarSkeleton />;

    return (
        <aside className="h-full w-16 sm:w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
            <div className="border-b border-base-300 w-full p-2 sm:p-3 lg:p-5">
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <Users className="size-5 sm:size-6" />
                    <span className="font-medium hidden lg:block">
                        Contacts
                    </span>
                </div>

                {/* Online Filter Toggle - Visible on all screens */}
                <div className="mt-2 lg:mt-3 flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-2">
                    <label className="cursor-pointer flex items-center gap-1 lg:gap-2">
                        <input
                            type="checkbox"
                            checked={showOnlineOnly}
                            onChange={(e) =>
                                setShowOnlineOnly(e.target.checked)
                            }
                            className="checkbox checkbox-xs sm:checkbox-sm"
                        />
                        <span className="text-xs sm:text-sm hidden lg:inline">
                            Show online only
                        </span>
                        <Eye className="size-4 lg:hidden" />
                    </label>
                    <span className="text-xs text-zinc-500">
                        ({onlineUsers.length - 1})
                    </span>
                </div>
            </div>

            <div className="overflow-y-auto w-full py-2 sm:py-3 flex-1">
                {filteredUsers.map((user) => (
                    <button
                        key={user._id}
                        onClick={() => setSelectedUser(user)}
                        className={`
                        w-full p-2 sm:p-3 flex flex-col lg:flex-row items-center gap-1 lg:gap-3
                        hover:bg-base-300 transition-colors
                        ${
                            selectedUser?._id === user._id
                                ? "bg-base-300 ring-1 ring-base-300"
                                : ""
                        }
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
                            <div className="font-medium truncate">
                                {user.fullName}
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
                ))}
                {filteredUsers.length === 0 && (
                    <div className="text-center text-zinc-500 py-4 text-xs sm:text-sm">
                        No online users
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
