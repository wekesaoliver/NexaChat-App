import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSTKPushRequest } from "./mpesa.js";

const base = {
    shortcode: "5874806",
    passkey: "testpasskey",
    timestamp: "20260818120000",
    phoneNumber: "254708374149",
    amount: 150,
    description: "Test payment",
    callbackUrl: "https://example.com/api/mpesa/callback",
};

test("buildSTKPushRequest: PayBill uses shortcode for BusinessShortCode and PartyB", () => {
    const req = buildSTKPushRequest({
        ...base,
        transactionType: "CustomerPayBillOnline",
    });
    assert.equal(req.TransactionType, "CustomerPayBillOnline");
    assert.equal(req.BusinessShortCode, "5874806");
    assert.equal(req.PartyB, "5874806");
    assert.equal(req.Amount, 150);
});

test("buildSTKPushRequest: Till uses shortcode for BusinessShortCode and till number for PartyB", () => {
    const req = buildSTKPushRequest({
        ...base,
        transactionType: "CustomerBuyGoodsOnline",
        tillNumber: "3480482",
    });
    assert.equal(req.TransactionType, "CustomerBuyGoodsOnline");
    assert.equal(req.BusinessShortCode, "5874806");
    assert.equal(req.PartyB, "3480482");
});

test("buildSTKPushRequest: rejects invalid transaction type", () => {
    assert.throws(
        () => buildSTKPushRequest({ ...base, transactionType: "BuyGoodsOnline" }),
        /Invalid MPESA_TRANSACTION_TYPE/
    );
});

test("buildSTKPushRequest: Till requires tillNumber", () => {
    assert.throws(
        () =>
            buildSTKPushRequest({
                ...base,
                transactionType: "CustomerBuyGoodsOnline",
            }),
        /MPESA_TILL_NUMBER is required/
    );
});
