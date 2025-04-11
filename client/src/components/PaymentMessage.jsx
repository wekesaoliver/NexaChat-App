// src/components/PaymentMessage.jsx
import React from "react";

const PaymentMessage = ({ amount, status, receipt, timestamp }) => {
    return (
        <div className="bg-primary/10 rounded-lg p-3 max-w-xs">
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Payment</div>
                <div className="text-xs opacity-70">{timestamp}</div>
            </div>

            <div className="text-lg font-bold mb-1">
                KES {amount.toFixed(2)}
            </div>

            <div className="flex items-center gap-2">
                <div
                    className={`size-2 rounded-full ${
                        status === "completed"
                            ? "bg-green-500"
                            : status === "pending"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                    }`}
                />
                <div className="text-xs">
                    {status === "completed"
                        ? `Paid · Receipt: ${receipt}`
                        : status === "pending"
                        ? "Processing..."
                        : "Failed"}
                </div>
            </div>
        </div>
    );
};

export default PaymentMessage;
