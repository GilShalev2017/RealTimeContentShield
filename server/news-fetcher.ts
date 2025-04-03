import axios from 'axios';
import { kafka, CONTENT_INGESTION_TOPIC } from './kafka';
import { ContentTypes, InsertContent } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

// Types for NewsAPI response
interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

// Function to fetch news from a public API
export async function fetchNewsArticles(): Promise<NewsAPIArticle[]> {
  // Using a free and open public API that doesn't require authentication
  const response = await axios.get<NewsAPIResponse>(
    'https://saurav.tech/NewsAPI/top-headlines/category/technology/us.json'
  );
  
  if (response.data.status === 'ok') {
    return response.data.articles;
  }
  
  throw new Error('Failed to fetch news articles');
}

// Process news articles and submit them to the content ingestion pipeline
export async function ingestNewsArticles() {
  try {
    const articles = await fetchNewsArticles();
    console.log(`Fetched ${articles.length} news articles`);
    
    // Process each article
    for (const article of articles) {
      if (!article.content || !article.title) continue;
      
      // Create content object for our system
      const content: InsertContent = {
        contentId: uuidv4(),
        title: article.title,
        text: article.content,
        type: ContentTypes.NEWS,
        source: article.source.name,
        metadata: {
          author: article.author,
          publishedAt: article.publishedAt,
          url: article.url,
          imageUrl: article.urlToImage,
        }
      };
      
      // Send to Kafka
      await kafka.produce(CONTENT_INGESTION_TOPIC, content);
      console.log(`Ingested article: ${article.title}`);
      
      // Add a small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('News ingestion complete');
    return true;
  } catch (error) {
    console.error('Error ingesting news articles:', error);
    return false;
  }
}