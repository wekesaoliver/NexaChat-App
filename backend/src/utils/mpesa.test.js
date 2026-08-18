import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSTKPushRequest, validateAdminPromptInput } from "./mpesa.js";

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

test("validateAdminPromptInput: rejects missing recipientId", () => {
    assert.ok(
        validateAdminPromptInput({ amount: 100, description: "test" }),
        "should return an error message"
    );
});

test("validateAdminPromptInput: rejects missing amount", () => {
    assert.ok(
        validateAdminPromptInput({ recipientId: "abc", description: "test" }),
        "should return an error message"
    );
});

test("validateAdminPromptInput: rejects invalid or non-positive amount", () => {
    assert.ok(
        validateAdminPromptInput({
            recipientId: "abc",
            amount: "not-a-number",
            description: "test",
        }),
        "should reject non-numeric amount"
    );
    assert.ok(
        validateAdminPromptInput({
            recipientId: "abc",
            amount: 0,
            description: "test",
        }),
        "should reject zero amount"
    );
});

test("validateAdminPromptInput: rejects missing description", () => {
    assert.ok(
        validateAdminPromptInput({ recipientId: "abc", amount: 100 }),
        "should return an error message"
    );
});

test("validateAdminPromptInput: returns null for valid input", () => {
    assert.equal(
        validateAdminPromptInput({
            recipientId: "abc",
            amount: 100,
            description: "test",
        }),
        null
    );
});
