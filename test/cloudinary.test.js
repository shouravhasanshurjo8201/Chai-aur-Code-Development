import assert from "node:assert/strict";
import { test } from "node:test";
import { getCloudinaryPublicIdFromUrl } from "../src/utils/cloudinary.js";

test("extracts a Cloudinary public ID from a versioned avatar URL", () => {
  assert.equal(
    getCloudinaryPublicIdFromUrl(
      "https://res.cloudinary.com/demo/image/upload/v1234567890/avatars/sample.jpg",
    ),
    "avatars/sample",
  );
});

test("extracts a Cloudinary public ID when transformations are present", () => {
  assert.equal(
    getCloudinaryPublicIdFromUrl(
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_200/v1234567890/avatars/sample.webp",
    ),
    "avatars/sample",
  );
});

test("returns null for URLs that are not versioned Cloudinary image URLs", () => {
  assert.equal(
    getCloudinaryPublicIdFromUrl("https://example.com/avatar.png"),
    null,
  );
  assert.equal(
    getCloudinaryPublicIdFromUrl(
      "https://res.cloudinary.com/demo/image/upload/avatars/sample.jpg",
    ),
    null,
  );
});
