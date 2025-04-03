import { 
  users, User, InsertUser, 
  contents, Content, InsertContent,
  contentAnalyses, ContentAnalysis, InsertContentAnalysis,
  aiRules, AiRule, InsertAiRule,
  stats, Stat, InsertStat,
  ContentCategories, ContentStatuses
} from "@shared/schema";

export interface IStorage {
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Content operations
  async getContent(id: number): Promise<Content | undefined> {
    return this.contents.get(id);
  }

  async getContentByContentId(contentId: string): Promise<Content | undefined> {
    return Array.from(this.contents.values()).find(
      (content) => content.contentId === contentId
    );
  }

  async createContent(insertContent: InsertContent): Promise<Content> {
    const id = this.contentIdCounter++;
    const content: Content = { 
      ...insertContent, 
      id, 
      createdAt: new Date() 
    };
    this.contents.set(id, content);
    
    // Update stats after content creation
    const latestStats = await this.getLatestStats();
    if (latestStats) {
      await this.updateStats(latestStats.id, { 
        totalContent: latestStats.totalContent + 1 
      });
    }
    
    return content;
  }

  async listContents(limit: number, offset: number): Promise<Content[]> {
    return Array.from(this.contents.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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
      (analysis) => analysis.contentId === contentId
    );
  }

  async createContentAnalysis(insertAnalysis: InsertContentAnalysis): Promise<ContentAnalysis> {
    const id = this.contentAnalysisIdCounter++;
    const analysis: ContentAnalysis = { 
      ...insertAnalysis, 
      id, 
      createdAt: new Date() 
    };
    this.contentAnalyses.set(id, analysis);
    
    // Update stats after analysis creation
    const latestStats = await this.getLatestStats();
    if (latestStats) {
      const updates: Partial<Stat> = {};
      
      if (analysis.flagged) {
        updates.flaggedContent = latestStats.flaggedContent + 1;
      }
      
      // Calculate average AI confidence
      const allAnalyses = Array.from(this.contentAnalyses.values());
      const totalConfidence = allAnalyses.reduce((sum, a) => sum + a.confidence, 0);
      updates.aiConfidence = Math.round(totalConfidence / allAnalyses.length);
      
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
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  // AI Rule operations
  async getAiRule(id: number): Promise<AiRule | undefined> {
    return this.aiRules.get(id);
  }

  async createAiRule(insertRule: InsertAiRule): Promise<AiRule> {
    const id = this.aiRuleIdCounter++;
    const rule: AiRule = { 
      ...insertRule, 
      id, 
      createdAt: new Date() 
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
      ...insertStats, 
      id, 
      date: new Date() 
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
      autoAction: "flag_for_review",
      active: true,
      icon: "ri-spam-2-line"
    });
    
    // Spam Detection
    this.createAiRule({
      name: "Spam Detection",
      description: "Identifies repetitive content, suspicious links, and commercial solicitation.",
      category: ContentCategories.SPAM,
      sensitivity: 90,
      autoAction: "auto_remove",
      active: true,
      icon: "ri-spam-line"
    });
    
    // Harassment Detection
    this.createAiRule({
      name: "Harassment Detection",
      description: "Identifies personal attacks, bullying, and targeted abuse against individuals.",
      category: ContentCategories.HARASSMENT,
      sensitivity: 65,
      autoAction: "flag_for_review",
      active: true,
      icon: "ri-user-settings-line"
    });
    
    // Explicit Content Detection
    this.createAiRule({
      name: "Explicit Content Detection",
      description: "Identifies sexual, graphic, or adult-oriented content.",
      category: ContentCategories.EXPLICIT,
      sensitivity: 85,
      autoAction: "auto_remove",
      active: true,
      icon: "ri-eye-off-line"
    });
  }

  private seedStats() {
    this.createStats({
      totalContent: 0,
      flaggedContent: 0,
      aiConfidence: 0,
      responseTime: 230,
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

export const storage = new MemStorage();
