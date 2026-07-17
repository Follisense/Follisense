import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  chatSessions: defineTable({
    userId: v.optional(v.id("users")),
    title: v.string(),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    sessionId: v.id("chatSessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.string(),
  }).index("by_session", ["sessionId"]),
});