import { 
  users, User, InsertUser, 
  contents, Content, InsertContent,
  contentAnalyses, ContentAnalysis, InsertContentAnalysis,
  aiRules, AiRule, InsertAiRule,
  stats, Stat, InsertStat,
  ContentCategories, ContentStatuses
} from "@shared/schema";
<<<<<<< HEAD
import { eq, desc, like, and, or, sql } from "drizzle-orm";
=======
import { eq, desc, like, and } from "drizzle-orm";
>>>>>>> 436e884279b69ba377195bc73602d820281e0969
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import connectPg from "connect-pg-simple";
import session from "express-session";

export interface IStorage {
  // Session store for authentication
  sessionStore: any; // Using 'any' type for session store due to compatibility issues
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Content operations
  getContent(id: number): Promise<Content | undefined>;
  getContentByContentId(contentId: string): Promise<Content | undefined>;
  createContent(content: InsertContent): Promise<Content>;
  listContents(limit: number, offset: number): Promise<Content[]>;
  searchContents(query: string): Promise<Content[]>;
  
  // Content Analysis operations
  getContentAnalysis(id: number): Promise<ContentAnalysis | undefined>;
  getContentAnalysisByContentId(contentId: number): Promise<ContentAnalysis | undefined>;
  createContentAnalysis(analysis: InsertContentAnalysis): Promise<ContentAnalysis>;
  updateContentAnalysisStatus(id: number, status: string): Promise<ContentAnalysis | undefined>;
  listContentAnalyses(limit: number, offset: number, status?: string): Promise<ContentAnalysis[]>;
  
  // AI Rule operations
  getAiRule(id: number): Promise<AiRule | undefined>;
  createAiRule(rule: InsertAiRule): Promise<AiRule>;
  updateAiRule(id: number, rule: Partial<AiRule>): Promise<AiRule | undefined>;
  listAiRules(): Promise<AiRule[]>;
  
  // Stats operations
  getLatestStats(): Promise<Stat | undefined>;
  createStats(stats: InsertStat): Promise<Stat>;
  updateStats(id: number, stats: Partial<Stat>): Promise<Stat | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contents: Map<number, Content>;
  private contentAnalyses: Map<number, ContentAnalysis>;
  private aiRules: Map<number, AiRule>;
  private statsData: Map<number, Stat>;
  
  private userIdCounter: number;
  private contentIdCounter: number;
  private contentAnalysisIdCounter: number;
  private aiRuleIdCounter: number;
  private statsIdCounter: number;
  
  public sessionStore: any;

  constructor() {
    this.users = new Map();
    this.contents = new Map();
    this.contentAnalyses = new Map();
    this.aiRules = new Map();
    this.statsData = new Map();
    
    this.userIdCounter = 1;
    this.contentIdCounter = 1;
    this.contentAnalysisIdCounter = 1;
    this.aiRuleIdCounter = 1;
    this.statsIdCounter = 1;
    
    // Create in-memory session store
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Seed default AI rules
    this.seedAiRules();
    // Seed initial stats
    this.seedStats();
    // Seed default admin user
    this.seedUsers();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || 'moderator',
      name: insertUser.name || '',
      avatarUrl: insertUser.avatarUrl || null
    };
    this.users.set(id, user);
    return user;
  }

  // Content operations
  async getContent(id: number): Promise<Content | undefined> {
    return this.contents.get(id);
  }

  async getContentByContentId(contentId: string): Promise<Content | undefined> {
    return Array.from(this.contents.values()).find(
      (content) => content.content_id === contentId
    );
  }

  async createContent(insertContent: InsertContent): Promise<Content> {
    const id = this.contentIdCounter++;
    const content: Content = { 
      id,
      type: insertContent.type, 
      content: insertContent.content,
      content_id: insertContent.content_id,
      user_id: insertContent.user_id || "system", // Use default if not provided
      metadata: insertContent.metadata || {},
      created_at: new Date() 
    };
    this.contents.set(id, content);
    
    // Update stats after content creation
    const latestStats = await this.getLatestStats();
    if (latestStats) {
      await this.updateStats(latestStats.id, { 
        total_content: latestStats.total_content + 1 
      });
    }
    
    return content;
  }

  async listContents(limit: number, offset: number): Promise<Content[]> {
    return Array.from(this.contents.values())
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(offset, offset + limit);
  }

  async searchContents(query: string): Promise<Content[]> {
    return Array.from(this.contents.values()).filter(
      (content) => content.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Content Analysis operations
  async getContentAnalysis(id: number): Promise<ContentAnalysis | undefined> {
    return this.contentAnalyses.get(id);
  }

  async getContentAnalysisByContentId(contentId: number): Promise<ContentAnalysis | undefined> {
    return Array.from(this.contentAnalyses.values()).find(
      (analysis) => analysis.content_id === contentId
    );
  }

  async createContentAnalysis(insertAnalysis: InsertContentAnalysis): Promise<ContentAnalysis> {
    const id = this.contentAnalysisIdCounter++;
    const analysis: ContentAnalysis = {
      id,
      content_id: insertAnalysis.content_id,
      confidence: insertAnalysis.confidence,
      status: insertAnalysis.status || ContentStatuses.PENDING,
      category: insertAnalysis.category || null,
      flagged: typeof insertAnalysis.flagged === 'boolean' ? insertAnalysis.flagged : false,
      ai_data: insertAnalysis.ai_data || {},
      created_at: new Date()
    };
    this.contentAnalyses.set(id, analysis);
    
    // Update stats after analysis creation
    const latestStats = await this.getLatestStats();
    if (latestStats) {
      const updates: Partial<Stat> = {};
      
      if (analysis.flagged) {
        updates.flagged_content = latestStats.flagged_content + 1;
      }
      
      // Calculate average AI confidence
      const allAnalyses = Array.from(this.contentAnalyses.values());
      const totalConfidence = allAnalyses.reduce((sum, a) => sum + a.confidence, 0);
      updates.ai_confidence = Math.round(totalConfidence / allAnalyses.length);
      
      await this.updateStats(latestStats.id, updates);
    }
    
    return analysis;
  }

  async updateContentAnalysisStatus(id: number, status: string): Promise<ContentAnalysis | undefined> {
    const analysis = this.contentAnalyses.get(id);
    if (!analysis) return undefined;
    
    const updatedAnalysis = { ...analysis, status };
    this.contentAnalyses.set(id, updatedAnalysis);
    return updatedAnalysis;
  }

  async listContentAnalyses(limit: number, offset: number, status?: string): Promise<ContentAnalysis[]> {
    let analyses = Array.from(this.contentAnalyses.values());
    
    if (status) {
      analyses = analyses.filter(analysis => analysis.status === status);
    }
    
    return analyses
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(offset, offset + limit);
  }

  // AI Rule operations
  async getAiRule(id: number): Promise<AiRule | undefined> {
    return this.aiRules.get(id);
  }

  async createAiRule(insertRule: InsertAiRule): Promise<AiRule> {
    const id = this.aiRuleIdCounter++;
    const rule: AiRule = {
      id,
      name: insertRule.name,
      description: insertRule.description,
      category: insertRule.category,
      sensitivity: insertRule.sensitivity,
      auto_action: insertRule.auto_action,
      active: typeof insertRule.active === 'boolean' ? insertRule.active : true,
      icon: insertRule.icon || null,
      created_at: new Date()
    };
    this.aiRules.set(id, rule);
    return rule;
  }

  async updateAiRule(id: number, ruleUpdate: Partial<AiRule>): Promise<AiRule | undefined> {
    const rule = this.aiRules.get(id);
    if (!rule) return undefined;
    
    const updatedRule = { ...rule, ...ruleUpdate };
    this.aiRules.set(id, updatedRule);
    return updatedRule;
  }

  async listAiRules(): Promise<AiRule[]> {
    return Array.from(this.aiRules.values());
  }

  // Stats operations
  async getLatestStats(): Promise<Stat | undefined> {
    const stats = Array.from(this.statsData.values());
    if (stats.length === 0) return undefined;
    
    return stats.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  }

  async createStats(insertStats: InsertStat): Promise<Stat> {
    const id = this.statsIdCounter++;
    const stats: Stat = {
      id,
      total_content: insertStats.total_content ?? 0,
      flagged_content: insertStats.flagged_content ?? 0,
      ai_confidence: insertStats.ai_confidence ?? 0,
      response_time: insertStats.response_time ?? 0,
      date: insertStats.date || new Date()
    };
    this.statsData.set(id, stats);
    return stats;
  }

  async updateStats(id: number, statsUpdate: Partial<Stat>): Promise<Stat | undefined> {
    const stats = this.statsData.get(id);
    if (!stats) return undefined;
    
    const updatedStats = { ...stats, ...statsUpdate };
    this.statsData.set(id, updatedStats);
    return updatedStats;
  }

  // Seed methods
  private seedAiRules() {
    // Hate Speech Detection
    this.createAiRule({
      name: "Hate Speech Detection",
      description: "Identifies content containing language that attacks or demeans groups based on protected characteristics.",
      category: ContentCategories.HATE_SPEECH,
      sensitivity: 75,
      auto_action: "flag_for_review",
      active: true,
      icon: "ri-spam-2-line"
    });
    
    // Spam Detection
    this.createAiRule({
      name: "Spam Detection",
      description: "Identifies repetitive content, suspicious links, and commercial solicitation.",
      category: ContentCategories.SPAM,
      sensitivity: 90,
      auto_action: "auto_remove",
      active: true,
      icon: "ri-spam-line"
    });
    
    // Harassment Detection
    this.createAiRule({
      name: "Harassment Detection",
      description: "Identifies personal attacks, bullying, and targeted abuse against individuals.",
      category: ContentCategories.HARASSMENT,
      sensitivity: 65,
      auto_action: "flag_for_review",
      active: true,
      icon: "ri-user-settings-line"
    });
    
    // Explicit Content Detection
    this.createAiRule({
      name: "Explicit Content Detection",
      description: "Identifies sexual, graphic, or adult-oriented content.",
      category: ContentCategories.EXPLICIT,
      sensitivity: 85,
      auto_action: "auto_remove",
      active: true,
      icon: "ri-eye-off-line"
    });
  }

  private seedStats() {
    this.createStats({
      total_content: 0,
      flagged_content: 0,
      ai_confidence: 0,
      response_time: 230,
      date: new Date()
    });
  }

  private seedUsers() {
    this.createUser({
      username: "admin",
      password: "password123", // In a real app, this would be hashed
      name: "John Smith",
      role: "admin",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    });
  }
}

export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private queryClient: ReturnType<typeof postgres>;
  public sessionStore: any; // Using 'any' type for session store due to compatibility issues

  constructor() {
    // Initialize database connection
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    // Configure Postgres client
    this.queryClient = postgres(process.env.DATABASE_URL, { max: 10 });
    
    // Initialize Drizzle ORM
    this.db = drizzle(this.queryClient);
    
    // Create session store
    const PostgresSessionStore = connectPg(session);
    // Explicitly cast the session store to 'any' to bypass type checking issues
    // This is a workaround for TypeScript type incompatibility between different versions of the libraries
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production'
      },
      createTableIfMissing: true
    }) as any;
    
    // Initialize database with seed data
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Check if there are AI rules
      const rulesCount = await this.db.select().from(aiRules);
      if (rulesCount.length === 0) {
        await this.seedAiRules();
      }
      
      // Check if there are stats
      const statsCount = await this.db.select().from(stats);
      if (statsCount.length === 0) {
        await this.seedStats();
      }
      
      // Check if there are users
      const usersCount = await this.db.select().from(users);
      if (usersCount.length === 0) {
        await this.seedUsers();
      }
      
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    // Ensure all required fields have values
    const userWithDefaults = {
      ...user,
      name: user.name || '',  // Default name if not provided
      role: user.role || 'moderator',  // Default role if not provided
      avatarUrl: user.avatarUrl || null  // Default avatarUrl if not provided
    };
    
    const result = await this.db.insert(users).values(userWithDefaults).returning();
    return result[0];
  }

  // Content operations
  async getContent(id: number): Promise<Content | undefined> {
    const result = await this.db.select().from(contents).where(eq(contents.id, id)).limit(1);
    return result[0];
  }

  async getContentByContentId(contentId: string): Promise<Content | undefined> {
    const result = await this.db.select().from(contents).where(eq(contents.content_id, contentId)).limit(1);
    return result[0];
  }

  async createContent(content: InsertContent): Promise<Content> {
    // Ensure all required fields have values
    const contentWithDefaults = {
      ...content,
      metadata: content.metadata || {}
    };
    
    const result = await this.db.insert(contents).values(contentWithDefaults).returning();
    
    // Update stats after content creation
    const latestStats = await this.getLatestStats();
    if (latestStats) {
      await this.updateStats(latestStats.id, { 
        total_content: latestStats.total_content + 1 
      });
    }
    
    return result[0];
  }

  async listContents(limit: number, offset: number): Promise<Content[]> {
    return this.db.select().from(contents).orderBy(desc(contents.created_at)).limit(limit).offset(offset);
  }

  async searchContents(query: string): Promise<Content[]> {
<<<<<<< HEAD
    if (!query) {
      return [];
    }
    
    const lowerCaseQuery = query.toLowerCase();
    
    // Use text search on different columns
    const results = await this.db.select().from(contents).where(
      or(
        like(contents.content, `%${query}%`),
        sql`lower(${contents.metadata}::text) like ${'%' + lowerCaseQuery + '%'}`
      )
    );
    
    return results;
=======
    return this.db.select().from(contents).where(like(contents.content, `%${query}%`));
>>>>>>> 436e884279b69ba377195bc73602d820281e0969
  }

  // Content Analysis operations
  async getContentAnalysis(id: number): Promise<ContentAnalysis | undefined> {
    const result = await this.db.select().from(contentAnalyses).where(eq(contentAnalyses.id, id)).limit(1);
    return result[0];
  }

  async getContentAnalysisByContentId(contentId: number): Promise<ContentAnalysis | undefined> {
    const result = await this.db.select().from(contentAnalyses).where(eq(contentAnalyses.content_id, contentId)).limit(1);
    return result[0];
  }

  async createContentAnalysis(analysis: InsertContentAnalysis): Promise<ContentAnalysis> {
    // Ensure all required fields have values
    const analysisWithDefaults = {
      ...analysis,
      status: analysis.status || ContentStatuses.PENDING,
      category: analysis.category || null,
      flagged: typeof analysis.flagged === 'boolean' ? analysis.flagged : false,
      ai_data: analysis.ai_data || {}
    };
    
    const result = await this.db.insert(contentAnalyses).values(analysisWithDefaults).returning();
    
    // Update stats after analysis creation
    const latestStats = await this.getLatestStats();
    if (latestStats) {
      const updates: Partial<Stat> = {};
      
      if (analysisWithDefaults.flagged) {
        updates.flagged_content = latestStats.flagged_content + 1;
      }
      
      // Calculate average AI confidence
      const allAnalyses = await this.db.select().from(contentAnalyses);
      const totalConfidence = allAnalyses.reduce((sum, a) => sum + a.confidence, 0);
      updates.ai_confidence = Math.round(totalConfidence / allAnalyses.length);
      
      await this.updateStats(latestStats.id, updates);
    }
    
    return result[0];
  }

  async updateContentAnalysisStatus(id: number, status: string): Promise<ContentAnalysis | undefined> {
    const result = await this.db.update(contentAnalyses)
      .set({ status })
      .where(eq(contentAnalyses.id, id))
      .returning();
    
    return result[0];
  }

  async listContentAnalyses(limit: number, offset: number, status?: string): Promise<ContentAnalysis[]> {
    if (status) {
      return this.db.select().from(contentAnalyses)
        .where(eq(contentAnalyses.status, status))
        .orderBy(desc(contentAnalyses.created_at))
        .limit(limit)
        .offset(offset);
    }
    
    return this.db.select().from(contentAnalyses)
      .orderBy(desc(contentAnalyses.created_at))
      .limit(limit)
      .offset(offset);
  }

  // AI Rule operations
  async getAiRule(id: number): Promise<AiRule | undefined> {
    const result = await this.db.select().from(aiRules).where(eq(aiRules.id, id)).limit(1);
    return result[0];
  }

  async createAiRule(rule: InsertAiRule): Promise<AiRule> {
    // Ensure all required fields have values
    const ruleWithDefaults = {
      ...rule,
      active: typeof rule.active === 'boolean' ? rule.active : true,
      icon: rule.icon || null
    };
    
    const result = await this.db.insert(aiRules).values(ruleWithDefaults).returning();
    return result[0];
  }

  async updateAiRule(id: number, rule: Partial<AiRule>): Promise<AiRule | undefined> {
    const result = await this.db.update(aiRules)
      .set(rule)
      .where(eq(aiRules.id, id))
      .returning();
    
    return result[0];
  }

  async listAiRules(): Promise<AiRule[]> {
    return this.db.select().from(aiRules);
  }

  // Stats operations
  async getLatestStats(): Promise<Stat | undefined> {
    const result = await this.db.select()
      .from(stats)
      .orderBy(desc(stats.date))
      .limit(1);
    
    return result[0];
  }

  async createStats(insertStats: InsertStat): Promise<Stat> {
    // Ensure all required fields have values
    const statsWithDefaults = {
      ...insertStats,
      total_content: insertStats.total_content ?? 0,
      flagged_content: insertStats.flagged_content ?? 0,
      ai_confidence: insertStats.ai_confidence ?? 0,
      response_time: insertStats.response_time ?? 0
    };
    
    const result = await this.db.insert(stats).values(statsWithDefaults).returning();
    return result[0];
  }

  async updateStats(id: number, statsUpdate: Partial<Stat>): Promise<Stat | undefined> {
    const result = await this.db.update(stats)
      .set(statsUpdate)
      .where(eq(stats.id, id))
      .returning();
    
    return result[0];
  }

  // Seed methods
  private async seedAiRules() {
    // Hate Speech Detection
    await this.createAiRule({
      name: "Hate Speech Detection",
      description: "Identifies content containing language that attacks or demeans groups based on protected characteristics.",
      category: ContentCategories.HATE_SPEECH,
      sensitivity: 75,
      auto_action: "flag_for_review",
      active: true,
      icon: "ri-spam-2-line"
    });
    
    // Spam Detection
    await this.createAiRule({
      name: "Spam Detection",
      description: "Identifies repetitive content, suspicious links, and commercial solicitation.",
      category: ContentCategories.SPAM,
      sensitivity: 90,
      auto_action: "auto_remove",
      active: true,
      icon: "ri-spam-line"
    });
    
    // Harassment Detection
    await this.createAiRule({
      name: "Harassment Detection",
      description: "Identifies personal attacks, bullying, and targeted abuse against individuals.",
      category: ContentCategories.HARASSMENT,
      sensitivity: 65,
      auto_action: "flag_for_review",
      active: true,
      icon: "ri-user-settings-line"
    });
    
    // Explicit Content Detection
    await this.createAiRule({
      name: "Explicit Content Detection",
      description: "Identifies sexual, graphic, or adult-oriented content.",
      category: ContentCategories.EXPLICIT,
      sensitivity: 85,
      auto_action: "auto_remove",
      active: true,
      icon: "ri-eye-off-line"
    });
  }

  private async seedStats() {
    await this.createStats({
      total_content: 0,
      flagged_content: 0,
      ai_confidence: 0,
      response_time: 230,
      date: new Date()
    });
  }

  private async seedUsers() {
    // Import hash function from auth-utils module
    const { hashPassword } = await import('./auth-utils');
    
    // Create user with properly hashed password
    await this.createUser({
      username: "admin",
      password: await hashPassword("password123"), 
      name: "John Smith",
      role: "admin",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    });
  }
}

// Use PostgreSQL storage instead of in-memory storage
export const storage = new PostgresStorage();
