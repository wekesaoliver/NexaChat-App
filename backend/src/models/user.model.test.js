import { test } from "node:test";
import assert from "node:assert/strict";
import User from "./user.model.js";

test("User schema includes phone field with default empty string", () => {
    const path = User.schema.path("phone");
    assert.ok(path, "phone field should exist");
    assert.equal(path.instance, "String");
    assert.equal(path.defaultValue, "");
});
