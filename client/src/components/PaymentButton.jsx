// src/components/PaymentButton.jsx
import React, { useState } from "react";
import { CreditCard } from "lucide-react";
import PaymentModal from "./PaymentModal";

const PaymentButton = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-sm btn-ghost gap-2"
                aria-label="Send payment"
            >
                <CreditCard className="size-4" />
                <span className="hidden sm:inline">Pay</span>
            </button>

            <PaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};

export default PaymentButton;
