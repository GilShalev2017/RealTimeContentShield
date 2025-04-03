import { EventEmitter } from 'events';
import { InsertContent, Content, InsertContentAnalysis, ContentAnalysis } from '@shared/schema';
import { storage } from './storage';
import { analyzeContent } from './ai';

// Simulate Kafka using an event emitter for the MVP
// In a real implementation, this would use the KafkaJS library
class KafkaSimulator extends EventEmitter {
  private topics: Map<string, any[]>;
  
  constructor() {
    super();
    this.topics = new Map();
  }
  
  // Simulate producing a message to a Kafka topic
  async produce(topic: string, message: any): Promise<void> {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, []);
    }
    
    this.topics.get(topic)?.push(message);
    this.emit(topic, message);
    
    console.log(`[Kafka] Message produced to topic ${topic}`);
    return Promise.resolve();
  }
  
  // Simulate consuming messages from a Kafka topic
  async consume(topic: string, callback: (message: any) => Promise<void>): Promise<void> {
    this.on(topic, callback);
    console.log(`[Kafka] Consumer registered for topic ${topic}`);
    return Promise.resolve();
  }
}

// Kafka topics
export const CONTENT_INGESTION_TOPIC = 'content-ingestion';
export const CONTENT_ANALYSIS_TOPIC = 'content-analysis';

// Initialize Kafka
export const kafka = new KafkaSimulator();

// Initialize Kafka consumers
export async function initializeKafka(): Promise<void> {
  // Consumer for content ingestion
  await kafka.consume(CONTENT_INGESTION_TOPIC, async (message) => {
    try {
      console.log(`[Kafka] Processing content ingestion message`, message);
      
      // Store content
      const content = await storage.createContent(message as InsertContent);
      
      // Send to analysis topic
      await kafka.produce(CONTENT_ANALYSIS_TOPIC, content);
    } catch (error) {
      console.error('[Kafka] Error processing content ingestion:', error);
    }
  });
  
  // Consumer for content analysis
  await kafka.consume(CONTENT_ANALYSIS_TOPIC, async (message) => {
    try {
      console.log(`[Kafka] Processing content analysis message`, message);
      
      const content = message as Content;
      
      // Analyze content using valid types (text and news)
      if (content.type !== 'text' && content.type !== 'news') {
        console.log(`[Kafka] Skipping unsupported content type: ${content.type}`);
        return;
      }
      
      // Analyze content using AI
      const startTime = Date.now();
      const analysis = await analyzeContent(content);
      const responseTime = Date.now() - startTime;
      
      // Save content analysis
      const contentAnalysis: InsertContentAnalysis = {
        content_id: content.id,
        category: analysis.category,
        confidence: analysis.confidence,
        flagged: analysis.flagged,
        status: analysis.status,
        ai_data: analysis.aiData
      };
      
      await storage.createContentAnalysis(contentAnalysis);
      
      // Update response time in stats
      const latestStats = await storage.getLatestStats();
      if (latestStats) {
        // Simple moving average for response time
        const newResponseTime = Math.round((latestStats.response_time + responseTime) / 2);
        await storage.updateStats(latestStats.id, { response_time: newResponseTime });
      }
      
    } catch (error) {
      console.error('[Kafka] Error processing content analysis:', error);
    }
  });
  
  console.log('[Kafka] Consumers initialized');
}
