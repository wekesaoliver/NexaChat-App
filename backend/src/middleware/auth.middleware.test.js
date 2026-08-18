import { test } from "node:test";
import assert from "node:assert/strict";
import { requireAdmin } from "./auth.middleware.js";

function makeRes() {
    const res = {};
    res.status = function (code) {
        this.statusCode = code;
        return this;
    };
    res.json = function (body) {
        this.body = body;
        return this;
    };
    return res;
}

test("requireAdmin: returns 403 for non-admin user and does not call next", () => {
    const req = { user: { role: "user" } };
    const res = makeRes();
    let nextCalled = false;
    requireAdmin(req, res, () => {
        nextCalled = true;
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, "Forbidden - Admin access required");
    assert.equal(nextCalled, false);
});

test("requireAdmin: returns 403 when req.user is missing", () => {
    const req = {};
    const res = makeRes();
    let nextCalled = false;
    requireAdmin(req, res, () => {
        nextCalled = true;
    });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test("requireAdmin: calls next for admin user", () => {
    const req = { user: { role: "admin" } };
    const res = makeRes();
    let nextCalled = false;
    requireAdmin(req, res, () => {
        nextCalled = true;
    });
    assert.equal(res.statusCode, undefined);
    assert.equal(nextCalled, true);
});