import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").default("moderator").notNull(),
  avatarUrl: text("avatar_url"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
  avatarUrl: true,
});

// Content model for user-generated content
export const contents = pgTable("contents", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // text, image, video, news, etc.
  content: text("content").notNull(), // Main content text
  content_id: text("content_id").notNull(), // Original ID from source system
  user_id: text("user_id").default("system").notNull(), // Original user ID from source system
  metadata: json("metadata"), // Additional content data
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentSchema = createInsertSchema(contents).pick({
  type: true,
  content: true,
  content_id: true,
  user_id: true,
  metadata: true,
});

// ContentAnalysis model for AI analysis results
export const contentAnalyses = pgTable("content_analyses", {
  id: serial("id").primaryKey(),
  content_id: integer("content_id").notNull(),
  category: text("category"), // hate_speech, spam, harassment, explicit, etc.
  confidence: integer("confidence").notNull(), // 0-100
  flagged: boolean("flagged").default(false).notNull(),
  status: text("status").default("pending").notNull(), // pending, reviewed, removed
  ai_data: json("ai_data"), // Raw AI analysis data
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentAnalysisSchema = createInsertSchema(contentAnalyses).pick({
  content_id: true,
  category: true, 
  confidence: true,
  flagged: true,
  status: true,
  ai_data: true,
});

// AI Rules model for moderation rules
export const aiRules = pgTable("ai_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  sensitivity: integer("sensitivity").notNull(), // 0-100
  auto_action: text("auto_action").notNull(), // flag, remove, etc.
  active: boolean("active").default(true).notNull(),
  icon: text("icon").default("ri-spam-2-line"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiRuleSchema = createInsertSchema(aiRules).pick({
  name: true,
  description: true,
  category: true,
  sensitivity: true,
  auto_action: true,
  active: true,
  icon: true,
});

// Stats model for platform analytics
export const stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  total_content: integer("total_content").default(0).notNull(),
  flagged_content: integer("flagged_content").default(0).notNull(),
  ai_confidence: integer("ai_confidence").default(0).notNull(),
  response_time: integer("response_time").default(0).notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export const insertStatsSchema = createInsertSchema(stats).pick({
  total_content: true,
  flagged_content: true,
  ai_confidence: true,
  response_time: true,
  date: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Content = typeof contents.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;

export type ContentAnalysis = typeof contentAnalyses.$inferSelect;
export type InsertContentAnalysis = z.infer<typeof insertContentAnalysisSchema>;

export type AiRule = typeof aiRules.$inferSelect;
export type InsertAiRule = z.infer<typeof insertAiRuleSchema>;

export type Stat = typeof stats.$inferSelect;
export type InsertStat = z.infer<typeof insertStatsSchema>;

// Common enums and constants
export const ContentTypes = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  NEWS: 'news',
  OTHER: 'other'
};

export const ContentCategories = {
  HATE_SPEECH: 'hate_speech',
  SPAM: 'spam',
  HARASSMENT: 'harassment',
  EXPLICIT: 'explicit',
  SAFE: 'safe'
};

export const ContentStatuses = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  REMOVED: 'removed',
  APPROVED: 'approved'
};

export const AutoActions = {
  FLAG: 'flag_for_review',
  REMOVE: 'auto_remove',
  NONE: 'none'
};
