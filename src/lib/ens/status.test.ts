import assert from "node:assert/strict";
import test from "node:test";
import {
  GRACE_PERIOD_SECONDS,
  classifyName,
  graceEndsAt,
  premiumEndsAt,
} from "./status.ts";

const now = 1_700_000_000;

test("active registration", () => {
  assert.equal(
    classifyName({
      expires: BigInt(now + 100),
      available: false,
      premiumWei: 0n,
      labelChars: 7,
      now,
    }),
    "registered",
  );
});

test("grace period after expiry", () => {
  const expires = BigInt(now - 10);
  assert.equal(
    classifyName({
      expires,
      available: false,
      premiumWei: 0n,
      labelChars: 4,
      now,
    }),
    "grace",
  );
  assert.equal(graceEndsAt(expires), Number(expires) + GRACE_PERIOD_SECONDS);
});

test("premium auction", () => {
  const expires = 1n;
  assert.equal(
    classifyName({
      expires,
      available: true,
      premiumWei: 5n,
      labelChars: 5,
      now,
    }),
    "premium",
  );
  assert.ok(premiumEndsAt(expires) > graceEndsAt(expires));
});

test("available at base price", () => {
  assert.equal(
    classifyName({
      expires: 0n,
      available: true,
      premiumWei: 0n,
      labelChars: 8,
      now,
    }),
    "available",
  );
});

test("short never-registered labels are invalid", () => {
  assert.equal(
    classifyName({
      expires: 0n,
      available: true,
      premiumWei: 0n,
      labelChars: 2,
      now,
    }),
    "invalid",
  );
});

test("registered short names stay registered", () => {
  assert.equal(
    classifyName({
      expires: BigInt(now + 50),
      available: false,
      premiumWei: 0n,
      labelChars: 1,
      now,
    }),
    "registered",
  );
});

test("read failure is invalid", () => {
  assert.equal(
    classifyName({
      expires: 0n,
      available: false,
      premiumWei: 0n,
      labelChars: 6,
      now,
      readFailed: true,
    }),
    "invalid",
  );
});
