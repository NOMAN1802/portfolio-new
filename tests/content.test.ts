import { test } from "node:test";
import assert from "node:assert/strict";
import {
  settingsSchema,
  defaultSettings,
  entrySchema,
  blankEntry,
  safeUrl,
  contactSchema,
} from "../src/lib/content";
test("unsafe links and script protocols are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.example",
    "https://",
  ])
    assert.equal(safeUrl.safeParse(url).success, false);
  assert.equal(safeUrl.safeParse("https://example.com/work").success, true);
});
test("section ordering requires each section exactly once", () => {
  assert.equal(settingsSchema.safeParse(defaultSettings).success, true);
  assert.equal(
    settingsSchema.safeParse({
      ...defaultSettings,
      sectionOrder: [
        "about",
        "about",
        "skills",
        "experience",
        "projects",
        "contact",
      ],
    }).success,
    false,
  );
});
test("experience rejects reversed dates and project slugs are validated", () => {
  assert.equal(
    entrySchema.safeParse({
      ...blankEntry,
      title: "Analyst",
      slug: "analyst",
      start: "2026-09-20",
      end: "2025-01-01",
    }).success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({ ...blankEntry, title: "Test", slug: "bad/slug" })
      .success,
    false,
  );
});
test("inquiries require valid contact details and meaningful message", () => {
  assert.equal(
    contactSchema.safeParse({
      name: "A",
      email: "invalid",
      service: "Analytics",
      message: "hi",
    }).success,
    false,
  );
  assert.equal(
    contactSchema.safeParse({
      name: "Test Person",
      email: "test@example.com",
      service: "Analytics",
      message: "I need help configuring event tracking.",
    }).success,
    true,
  );
});
