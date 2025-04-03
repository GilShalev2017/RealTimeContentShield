import OpenAI from 'openai';
import { Content, ContentCategories, ContentStatuses } from '@shared/schema';
import { storage } from './storage';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-development'
});

interface ContentAnalysisResult {
  category: string;
  confidence: number;
  flagged: boolean;
  status: string;
  aiData: any;
}

// Analyze content using OpenAI
export async function analyzeContent(content: Content): Promise<ContentAnalysisResult> {
  try {
    // Skip API call if no key is provided - use rules-based approach instead
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-dummy-key-for-development') {
      return analyzeFallback(content);
    }
    
    // Check content against AI rules
    const rules = await storage.listAiRules();
    
    // Get text to analyze
    let textContent = '';
    
    // News content has 'content' property and 'metadata' with 'title'
    if (content.type === 'news' && content.metadata) {
      const metadata = content.metadata as any;
      textContent = `Title: ${metadata.title || 'No title'}\nContent: ${content.content || 'No content'}`;
    } else {
      // Legacy content has 'title' and 'text' properties
      textContent = `Title: ${(content as any).title || 'No title'}\nContent: ${(content as any).text || 'No content'}`;
    }
    
    console.log(`Analyzing content: ${content.content_id}`); // Add logging for debugging
    
    // Use OpenAI to analyze content
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a content moderation AI. Analyze the following content and determine if it violates any content policies. 
          Specifically look for: hate speech, harassment, explicit content, or spam.
          
          Respond with a JSON object with the following fields:
          - category: The category of violation (${Object.values(ContentCategories).join(', ')})
          - confidence: A number between 0 and 100 indicating your confidence
          - reasons: An array of reasons why the content might violate policies
          - flagged: A boolean indicating if the content should be flagged for review`
        },
        {
          role: "user",
          content: textContent
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || '{"category": "safe", "confidence": 0, "reasons": [], "flagged": false}');
    
    // Determine if content should be flagged based on rules
    const rule = rules.find(r => r.category === result.category && r.active);
    const shouldFlag = rule ? (result.confidence >= rule.sensitivity) : result.flagged;
    const status = shouldFlag ? (rule?.auto_action === 'auto_remove' ? ContentStatuses.REMOVED : ContentStatuses.PENDING) : ContentStatuses.APPROVED;
    
    return {
      category: result.category,
      confidence: result.confidence,
      flagged: shouldFlag,
      status: status,
      aiData: result
    };
  } catch (error) {
    console.error('Error analyzing content with OpenAI:', error);
    // Fallback to rule-based analysis
    return analyzeFallback(content);
  }
}

// Fallback analysis using rule-based approach
async function analyzeFallback(content: Content): Promise<ContentAnalysisResult> {
  let textContent = '';
  
  // Format content based on type
  if (content.type === 'news' && content.metadata) {
    const metadata = content.metadata as any;
    textContent = `${metadata.title || ''} ${content.content || ''}`.toLowerCase();
  } else {
    // For legacy content
    textContent = `${(content as any).title || ''} ${(content as any).text || ''}`.toLowerCase();
  }
  
  const rules = await storage.listAiRules();
  console.log(`Fallback analyzing content: ${content.content_id}`);
  
  // Simple keyword-based detection
  const hateKeywords = ['hate', 'racist', 'discrimination', 'bigot'];
  const harassmentKeywords = ['harass', 'bully', 'threat', 'stalking'];
  const explicitKeywords = ['porn', 'sex', 'nude', 'explicit'];
  const spamKeywords = ['buy now', 'click here', 'free money', 'discount', 'limited time'];
  
  let category = ContentCategories.SAFE;
  let confidence = 0;
  let reasons: string[] = [];
  
  // Check for hate speech
  if (hateKeywords.some(keyword => textContent.includes(keyword))) {
    category = ContentCategories.HATE_SPEECH;
    confidence = 75;
    reasons.push('Contains keywords associated with hate speech');
  }
  // Check for harassment
  else if (harassmentKeywords.some(keyword => textContent.includes(keyword))) {
    category = ContentCategories.HARASSMENT;
    confidence = 70;
    reasons.push('Contains keywords associated with harassment');
  }
  // Check for explicit content
  else if (explicitKeywords.some(keyword => textContent.includes(keyword))) {
    category = ContentCategories.EXPLICIT;
    confidence = 85;
    reasons.push('Contains keywords associated with explicit content');
  }
  // Check for spam
  else if (spamKeywords.some(keyword => textContent.includes(keyword))) {
    category = ContentCategories.SPAM;
    confidence = 90;
    reasons.push('Contains keywords associated with spam');
  }
  
  // Determine if content should be flagged based on rules
  const rule = rules.find(r => r.category === category && r.active);
  const shouldFlag = category !== ContentCategories.SAFE && rule ? (confidence >= rule.sensitivity) : false;
  const status = shouldFlag ? (rule?.auto_action === 'auto_remove' ? ContentStatuses.REMOVED : ContentStatuses.PENDING) : ContentStatuses.APPROVED;
  
  return {
    category,
    confidence,
    flagged: shouldFlag,
    status,
    aiData: { category, confidence, reasons, flagged: shouldFlag }
  };
}
