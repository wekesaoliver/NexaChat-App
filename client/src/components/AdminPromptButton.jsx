// src/components/AdminPromptButton.jsx
import React, { useState } from "react";
import { Smartphone } from "lucide-react";
import AdminPromptModal from "./AdminPromptModal";

const AdminPromptButton = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-sm btn-ghost gap-2"
                aria-label="Send M-Pesa Express prompt"
            >
                <Smartphone className="size-4" />
                <span className="hidden sm:inline">M-Pesa Express</span>
            </button>

            <AdminPromptModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};

export default AdminPromptButton;
