import { describe, it, expect } from "vitest";
import { isValidImageUrl, seedToPost, SeedPost } from "@/components/community/community-types";

describe("isValidImageUrl", () => {
  it("returns false for null", () => {
    expect(isValidImageUrl(null)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidImageUrl("")).toBe(false);
  });

  it("returns true for a valid URL", () => {
    expect(isValidImageUrl("https://example.com/photo.jpg")).toBe(true);
  });

  it("returns false for URL containing 'undefined'", () => {
    expect(isValidImageUrl("https://example.com/undefined")).toBe(false);
  });

  it("returns false for URL containing 'placeholder'", () => {
    expect(isValidImageUrl("https://example.com/placeholder.jpg")).toBe(false);
  });
});

describe("seedToPost", () => {
  const seed: SeedPost = {
    id: "abc123",
    username: "testuser",
    caption: "Nice outfit",
    image_url: "https://example.com/img.jpg",
    like_count: 42,
    created_at: "2026-01-01T00:00:00Z",
  };

  const post = seedToPost(seed);

  it("sets id as 'seed-' + original id", () => {
    expect(post.id).toBe("seed-abc123");
  });

  it("sets user_id as empty string", () => {
    expect(post.user_id).toBe("");
  });

  it("maps result_photo_url from image_url", () => {
    expect(post.result_photo_url).toBe(seed.image_url);
  });

  it("maps caption", () => {
    expect(post.caption).toBe(seed.caption);
  });

  it("maps created_at", () => {
    expect(post.created_at).toBe(seed.created_at);
  });

  it("maps display_name from username", () => {
    expect(post.profile?.display_name).toBe(seed.username);
  });

  it("maps rating_count from like_count", () => {
    expect(post.rating_count).toBe(seed.like_count);
  });
});
