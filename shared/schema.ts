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
  title: text("title"), // Title or heading of the content
  text: text("text").notNull(), // Main content text
  contentId: text("content_id").notNull(), // Original ID from source system
  userId: text("user_id").default("system").notNull(), // Original user ID from source system
  source: text("source"), // Source of the content (e.g., platform name)
  metadata: json("metadata"), // Additional content data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentSchema = createInsertSchema(contents).pick({
  type: true,
  title: true,
  text: true,
  contentId: true,
  userId: true,
  source: true,
  metadata: true,
});

// ContentAnalysis model for AI analysis results
export const contentAnalyses = pgTable("content_analyses", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull(),
  category: text("category"), // hate_speech, spam, harassment, explicit, etc.
  confidence: integer("confidence").notNull(), // 0-100
  flagged: boolean("flagged").default(false).notNull(),
  status: text("status").default("pending").notNull(), // pending, reviewed, removed
  aiData: json("ai_data"), // Raw AI analysis data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentAnalysisSchema = createInsertSchema(contentAnalyses).pick({
  contentId: true,
  category: true, 
  confidence: true,
  flagged: true,
  status: true,
  aiData: true,
});

// AI Rules model for moderation rules
export const aiRules = pgTable("ai_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  sensitivity: integer("sensitivity").notNull(), // 0-100
  autoAction: text("auto_action").notNull(), // flag, remove, etc.
  active: boolean("active").default(true).notNull(),
  icon: text("icon").default("ri-spam-2-line"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiRuleSchema = createInsertSchema(aiRules).pick({
  name: true,
  description: true,
  category: true,
  sensitivity: true,
  autoAction: true,
  active: true,
  icon: true,
});

// Stats model for platform analytics
export const stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  totalContent: integer("total_content").default(0).notNull(),
  flaggedContent: integer("flagged_content").default(0).notNull(),
  aiConfidence: integer("ai_confidence").default(0).notNull(),
  responseTime: integer("response_time").default(0).notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export const insertStatsSchema = createInsertSchema(stats).pick({
  totalContent: true,
  flaggedContent: true,
  aiConfidence: true,
  responseTime: true,
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
