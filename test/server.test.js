import assert from "node:assert/strict";
import { after, test } from "node:test";
import { readdir } from "node:fs/promises";
import { app } from "../src/app.js";

const server = app.listen(0);
const baseUrl = await new Promise((resolve) => {
  server.once("listening", () => {
    resolve(`http://127.0.0.1:${server.address().port}`);
  });
});

after(
  () =>
    new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
);

test("health endpoint responds successfully", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { message: "Server running" });
});

test("registration rejects requests without required fields", async () => {
  const response = await fetch(`${baseUrl}/api/v1/users/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("registration requires an avatar upload", async () => {
  const response = await fetch(`${baseUrl}/api/v1/users/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "sample",
      email: "sample@example.com",
      fullName: "Sample User",
      password: "test-password",
    }),
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, "Avatar image is required");
});

test("refresh-token endpoint rejects requests without a refresh cookie", async () => {
  const response = await fetch(`${baseUrl}/api/v1/users/refresh-token`, {
    method: "POST",
  });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, "Refresh token is required");
});

test("login rejects requests without credentials", async () => {
  const response = await fetch(`${baseUrl}/api/v1/users/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
});

test("protected user endpoints reject requests without an access token", async () => {
  const cases = [
    ["POST", "/logout"],
    ["POST", "/change-password"],
    ["GET", "/current-user"],
    ["PATCH", "/updateuserprofileditela"],
    ["PATCH", "/avatar_update"],
  ];

  for (const [method, path] of cases) {
    const response = await fetch(`${baseUrl}/api/v1/users${path}`, {
      method,
    });

    assert.equal(response.status, 401, `${method} ${path}`);
    assert.equal(
      (await response.json()).message,
      "Authentication is required",
      `${method} ${path}`,
    );
  }
});

test("registration removes uploaded files when required fields are missing", async () => {
  const form = new FormData();
  form.set("avatar", new Blob(["avatar"]), "avatar.png");

  const filesBefore = await readdir("public/temp").catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const response = await fetch(`${baseUrl}/api/v1/users/register`, {
    method: "POST",
    body: form,
  });
  const filesAfter = await readdir("public/temp");

  assert.equal(response.status, 400);
  assert.equal(filesAfter.length, filesBefore.length);
});
