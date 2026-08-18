import { test } from "node:test";
import assert from "node:assert/strict";
import {
    canSendMessage,
    canGetMessages,
    canDeleteMessage,
    isValidAdminCode,
    toggleLike,
} from "./permissions.js";

const admin = { _id: "a1", role: "admin" };
const user = { _id: "u1", role: "user" };
const otherUser = { _id: "u2", role: "user" };

test("canSendMessage: admin can send to anyone", () => {
    assert.equal(canSendMessage(admin, user), true);
    assert.equal(canSendMessage(admin, otherUser), true);
});

test("canSendMessage: non-admin can only send to admin", () => {
    assert.equal(canSendMessage(user, admin), true);
    assert.equal(canSendMessage(user, otherUser), false);
});

test("canGetMessages: admin can view any conversation", () => {
    assert.equal(canGetMessages(admin, user), true);
});

test("canGetMessages: non-admin can only view conversation with admin", () => {
    assert.equal(canGetMessages(user, admin), true);
    assert.equal(canGetMessages(user, otherUser), false);
});

test("canDeleteMessage: admin can delete any message", () => {
    const message = { senderId: "u2" };
    assert.equal(canDeleteMessage(admin, message), true);
});

test("canDeleteMessage: non-admin can delete only own messages", () => {
    const ownMessage = { senderId: "u1" };
    const otherMessage = { senderId: "u2" };
    assert.equal(canDeleteMessage(user, ownMessage), true);
    assert.equal(canDeleteMessage(user, otherMessage), false);
});

test("isValidAdminCode: matches env var", () => {
    process.env.ADMIN_SIGNUP_CODE = "secret123";
    assert.equal(isValidAdminCode("secret123"), true);
    assert.equal(isValidAdminCode("wrong"), false);
    delete process.env.ADMIN_SIGNUP_CODE;
});

test("isValidAdminCode: false when env var not set", () => {
    delete process.env.ADMIN_SIGNUP_CODE;
    assert.equal(isValidAdminCode("anything"), false);
});

test("toggleLike: adds userId when not present", () => {
    const result = toggleLike([], "u1");
    assert.deepEqual(result.map(String), ["u1"]);
});

test("toggleLike: removes userId when present", () => {
    const result = toggleLike(["u1", "u2"], "u1");
    assert.deepEqual(result.map(String), ["u2"]);
});