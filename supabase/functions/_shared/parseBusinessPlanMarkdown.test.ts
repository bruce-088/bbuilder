// Unit tests for the verbatim Business Plan parser.
// Run with: deno test supabase/functions/_shared/parseBusinessPlanMarkdown.test.ts

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  findLatestPlanInMessages,
  looksLikeBusinessPlan,
  parseBusinessPlanMarkdown,
} from "./parseBusinessPlanMarkdown.ts";

const SAMPLE = `# 💡 The LNKDN Architect

Asynchronous LinkedIn personal brand building for busy tech founders and executives.

## 🎯 The Niche

This isn't just ghostwriting. It's a "done-for-you" system that turns a client's scattered genius into a polished, magnetic personal brand on LinkedIn, all without them ever needing to join a single meeting.

## 👥 Target Audience

B2B SaaS founders, VC-backed entrepreneurs, and senior tech executives.

These are brilliant, time-poor experts who know they need a strong LinkedIn presence.

## 💰 Revenue Math (Path to $10K/month)

Price Per Client: $2,500 / month
Clients Needed: 5 Clients
Net Profit: $12,365 / month
`;

Deno.test("looksLikeBusinessPlan detects canonical plan", () => {
  assert(looksLikeBusinessPlan(SAMPLE));
  assert(!looksLikeBusinessPlan("hello world"));
  assert(!looksLikeBusinessPlan(""));
});

Deno.test("parseBusinessPlanMarkdown returns verbatim sections", () => {
  const parsed = parseBusinessPlanMarkdown(SAMPLE);
  assertExists(parsed);
  assertEquals(parsed!.title, "💡 The LNKDN Architect");
  assertEquals(
    parsed!.subtitle,
    "Asynchronous LinkedIn personal brand building for busy tech founders and executives.",
  );
  assertEquals(parsed!.sections.length, 3);
  assertEquals(parsed!.sections[0].heading, "🎯 The Niche");
  // Body must be byte-for-byte preserved (no summarization)
  assert(
    parsed!.sections[0].body.startsWith(
      `This isn't just ghostwriting. It's a "done-for-you" system`,
    ),
  );
  assert(parsed!.sections[0].body.endsWith("a single meeting."));
  assertEquals(parsed!.sections[2].heading, "💰 Revenue Math (Path to $10K/month)");
  assert(parsed!.sections[2].body.includes("Net Profit: $12,365 / month"));
});

Deno.test("parseBusinessPlanMarkdown returns null on garbage", () => {
  assertEquals(parseBusinessPlanMarkdown(""), null);
  assertEquals(parseBusinessPlanMarkdown("just a sentence"), null);
});

Deno.test("findLatestPlanInMessages picks most recent assistant plan", () => {
  const messages = [
    { role: "user", content: "give me an idea" },
    { role: "assistant", content: "# Old plan\n## 🎯 The Niche\nold" },
    { role: "user", content: "another" },
    { role: "assistant", content: SAMPLE },
    { role: "user", content: "export it as a pdf" },
  ];
  const found = findLatestPlanInMessages(messages);
  assertExists(found);
  assert(found!.includes("The LNKDN Architect"));
});

Deno.test("findLatestPlanInMessages ignores non-plan assistant messages", () => {
  const messages = [
    { role: "assistant", content: "Sure, I can help with that." },
    { role: "user", content: "thanks" },
  ];
  assertEquals(findLatestPlanInMessages(messages), null);
});
