"use client";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import {
    LogOut,
    MessageSquare,
    Settings,
    User,
    Store,
    LayoutGrid,
} from "lucide-react";
import { useEffect, useState } from "react";

const Navbar = () => {
    const { logout, authUser } = useAuthStore();
    const [storeUrl, setStoreUrl] = useState("");

    useEffect(() => {
        axiosInstance
            .get("/config")
            .then((res) => setStoreUrl(res.data.storeUrl))
            .catch(() => {});
    }, []);

    return (
        <header
            className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40
            backdrop-blur-lg bg-base-100/80"
        >
            <div className="container mx-auto px-2 sm:px-4 h-16">
                <div className="flex items-center justify-between h-full">
                    <div className="flex items-center gap-2 sm:gap-8">
                        <Link
                            to="/"
                            className="flex items-center gap-1.5 sm:gap-2.5 hover:opacity-80 transition-all"
                        >
                            <div className="size-7 sm:size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            </div>
                            <h1 className="text-base sm:text-lg font-bold">
                                NexaChat
                            </h1>
                        </Link>
                        <Link
                            to="/"
                            className="btn btn-sm btn-ghost gap-1"
                        >
                            <LayoutGrid className="size-4" />
                            <span className="hidden sm:inline">Posts</span>
                        </Link>
                        <Link
                            to="/chat"
                            className="btn btn-sm btn-ghost gap-1"
                        >
                            <MessageSquare className="size-4" />
                            <span className="hidden sm:inline">Chat</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        {storeUrl && (
                            <a
                                href={storeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-primary gap-1"
                            >
                                <Store className="size-4" />
                                <span className="hidden sm:inline">
                                    Visit Store
                                </span>
                            </a>
                        )}
                        <Link
                            to={"/settings"}
                            className={`
                            btn btn-sm gap-1 sm:gap-2 transition-colors p-1 sm:p-2
                            `}
                        >
                            <Settings className="w-4 h-4" />
                            <span className="hidden sm:inline">Settings</span>
                        </Link>

                        {authUser && (
                            <>
                                <Link
                                    to={"/profile"}
                                    className={`btn btn-sm gap-1 sm:gap-2 p-1 sm:p-2`}
                                >
                                    <User className="size-4 sm:size-5" />
                                    <span className="hidden sm:inline">
                                        Profile
                                    </span>
                                </Link>

                                <button
                                    className="flex gap-1 sm:gap-2 items-center p-1 sm:p-2"
                                    onClick={logout}
                                >
                                    <LogOut className="size-4 sm:size-5" />
                                    <span className="hidden sm:inline">
                                        Logout
                                    </span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
