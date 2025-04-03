import express from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { kafka, CONTENT_INGESTION_TOPIC, initializeKafka } from "./kafka";
import { setupAuth, ensureAuthenticated } from "./auth";
import { ingestNewsArticles } from "./news-fetcher";
import {
  insertContentSchema,
  insertContentAnalysisSchema,
  insertAiRuleSchema,
  ContentStatuses
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time updates with simpler configuration
  // Use the noServer option to avoid binding issues on Windows
  const wss = new WebSocketServer({ 
    noServer: true
  });
  
  // Handle upgrade manually to avoid binding issues
  httpServer.on('upgrade', function upgrade(request, socket, head) {
    if (request.url === '/ws') {
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request);
      });
    }
  });
  
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    
    // Send initial data to client
    sendInitialData(ws);
    
    ws.on("error", (error) => console.error("WebSocket error:", error));
    ws.on("close", (code, reason) => console.log(`WebSocket client disconnected. Code: ${code}, Reason: ${reason || 'none provided'}`));
  });
  
  // Initialize Kafka
  await initializeKafka();
  
  // Setup authentication with Passport
  setupAuth(app);
  
  // Content routes
  app.post("/api/content", async (req, res) => {
    try {
      const content = insertContentSchema.parse(req.body);
      
      // Send content to Kafka for processing
      await kafka.produce(CONTENT_INGESTION_TOPIC, content);
      
      res.status(202).json({ message: "Content received for processing" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid content data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process content" });
    }
  });
  
  app.get("/api/content", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const contents = await storage.listContents(limit, offset);
      res.json(contents);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve content list" });
    }
  });
  
  app.get("/api/content/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const contents = await storage.searchContents(query);
      res.json(contents);
    } catch (error) {
      res.status(500).json({ message: "Failed to search content" });
    }
  });
  
  // Content Analysis routes
  app.get("/api/content-analysis", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      
      const analyses = await storage.listContentAnalyses(limit, offset, status);
      
      // Enrich with content data
      const enrichedAnalyses = await Promise.all(
        analyses.map(async (analysis) => {
          const content = await storage.getContent(analysis.content_id);
          return {
            ...analysis,
            content
          };
        })
      );
      
      res.json(enrichedAnalyses);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve content analyses" });
    }
  });
  
  app.patch("/api/content-analysis/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!Object.values(ContentStatuses).includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const updatedAnalysis = await storage.updateContentAnalysisStatus(id, status);
      
      if (!updatedAnalysis) {
        return res.status(404).json({ message: "Content analysis not found" });
      }
      
      // Notify connected clients of the status change
      const content = await storage.getContent(updatedAnalysis.content_id);
      broadcastUpdate(wss, {
        type: 'content_status_update',
        data: { ...updatedAnalysis, content }
      });
      
      res.json(updatedAnalysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to update content analysis status" });
    }
  });
  
  // AI Rules routes
  app.get("/api/ai-rules", async (req, res) => {
    try {
      const rules = await storage.listAiRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve AI rules" });
    }
  });
  
  app.post("/api/ai-rules", async (req, res) => {
    try {
      const rule = insertAiRuleSchema.parse(req.body);
      const createdRule = await storage.createAiRule(rule);
      
      // Notify connected clients about the new rule
      broadcastUpdate(wss, {
        type: 'ai_rule_created',
        data: createdRule
      });
      
      res.status(201).json(createdRule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rule data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create AI rule" });
    }
  });
  
  app.patch("/api/ai-rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ruleUpdate = req.body;
      
      const updatedRule = await storage.updateAiRule(id, ruleUpdate);
      
      if (!updatedRule) {
        return res.status(404).json({ message: "AI rule not found" });
      }
      
      // Notify connected clients about the rule update
      broadcastUpdate(wss, {
        type: 'ai_rule_updated',
        data: updatedRule
      });
      
      res.json(updatedRule);
    } catch (error) {
      res.status(500).json({ message: "Failed to update AI rule" });
    }
  });
  
  // Stats routes
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getLatestStats();
      
      if (!stats) {
        return res.status(404).json({ message: "Stats not found" });
      }
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve stats" });
    }
  });
  
  // News fetcher routes
  // Public route for demo purposes
  app.post("/api/fetch-news", async (req, res) => {
    try {
      console.log("Starting news ingestion (public route)...");
      
      // Run news fetching in the background
      ingestNewsArticles()
        .then(success => {
          console.log("News ingestion completed, success:", success);
          
          // Update stats and notify connected clients
          storage.getLatestStats().then(stats => {
            if (stats) {
              broadcastUpdate(wss, {
                type: 'stats_update',
                data: stats
              });
            }
          });
        })
        .catch(err => console.error("News ingestion error:", err));
      
      // Immediately return to client
      res.status(202).json({ message: "News fetching started" });
    } catch (error) {
      console.error("Error triggering news fetch:", error);
      res.status(500).json({ message: "Failed to start news fetching" });
    }
  });
  
  // Protected route for authenticated users
  app.post("/api/news/fetch", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Starting news ingestion...");
      
      // Run news fetching in the background
      ingestNewsArticles()
        .then(success => {
          console.log("News ingestion completed, success:", success);
          
          // Update stats and notify connected clients
          storage.getLatestStats().then(stats => {
            if (stats) {
              broadcastUpdate(wss, {
                type: 'stats_update',
                data: stats
              });
            }
          });
        })
        .catch(err => console.error("News ingestion error:", err));
      
      // Immediately return to client
      res.status(202).json({ message: "News fetching started" });
    } catch (error) {
      console.error("Error triggering news fetch:", error);
      res.status(500).json({ message: "Failed to start news fetching" });
    }
  });
  
  return httpServer;
}

// Helper function to send initial data to a new WebSocket client
async function sendInitialData(ws: any) {
  try {
    // Send latest stats
    const stats = await storage.getLatestStats();
    ws.send(JSON.stringify({
      type: 'stats_update',
      data: stats
    }));
    
    // Send recent flagged content
    const analyses = await storage.listContentAnalyses(5, 0, ContentStatuses.PENDING);
    const enrichedAnalyses = await Promise.all(
      analyses.map(async (analysis) => {
        const content = await storage.getContent(analysis.content_id);
        return {
          ...analysis,
          content
        };
      })
    );
    
    ws.send(JSON.stringify({
      type: 'flagged_content_update',
      data: enrichedAnalyses
    }));
    
    // Send AI rules
    const rules = await storage.listAiRules();
    ws.send(JSON.stringify({
      type: 'ai_rules_update',
      data: rules
    }));
  } catch (error) {
    console.error('Error sending initial data over WebSocket:', error);
  }
}

// Helper function to broadcast updates to all connected clients
function broadcastUpdate(wss: WebSocketServer, update: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(update));
    }
  });
}
