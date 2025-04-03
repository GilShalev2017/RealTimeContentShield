import { apiRequest } from "./queryClient";

// Authentication API
export const authApi = {
  login: async (data: { username: string, password: string }) => {
    const res = await apiRequest("POST", "/api/auth/login", data);
    return await res.json();
  },
  
  logout: async () => {
    const res = await apiRequest("POST", "/api/auth/logout");
    return await res.json();
  },
  
  getCurrentUser: async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      return await res.json();
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('401:')) {
        return null;
      }
      throw error;
    }
  },
  
  checkAuth: async () => {
    try {
      await apiRequest("GET", "/api/auth/check");
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('401:')) {
        return false;
      }
      throw error;
    }
  }
};

// Content API
export const contentApi = {
  submitContent: async (content: any) => {
    const res = await apiRequest("POST", "/api/content", content);
    return await res.json();
  },
  
  listContents: async (limit = 10, offset = 0) => {
    const res = await apiRequest("GET", `/api/content?limit=${limit}&offset=${offset}`);
    return await res.json();
  },
  
  searchContents: async (query: string) => {
    const res = await apiRequest("GET", `/api/content/search?q=${encodeURIComponent(query)}`);
    return await res.json();
  },
  
  fetchNews: async () => {
    const res = await apiRequest("POST", "/api/fetch-news");
    return await res.json();
  }
};

// Content Analysis API
export const contentAnalysisApi = {
  listAnalyses: async (limit = 10, offset = 0, status?: string) => {
    const statusParam = status ? `&status=${status}` : '';
    const res = await apiRequest("GET", `/api/content-analysis?limit=${limit}&offset=${offset}${statusParam}`);
    return await res.json();
  },
  
  updateStatus: async (id: number, status: string) => {
    const res = await apiRequest("PATCH", `/api/content-analysis/${id}/status`, { status });
    return await res.json();
  }
};

// AI Rules API
export const aiRulesApi = {
  listRules: async () => {
    const res = await apiRequest("GET", "/api/ai-rules");
    return await res.json();
  },
  
  createRule: async (rule: any) => {
    const res = await apiRequest("POST", "/api/ai-rules", rule);
    return await res.json();
  },
  
  updateRule: async (id: number, rule: any) => {
    const res = await apiRequest("PATCH", `/api/ai-rules/${id}`, rule);
    return await res.json();
  }
};

// Stats API
export const statsApi = {
  getLatestStats: async () => {
    const res = await apiRequest("GET", "/api/stats");
    return await res.json();
  }
};

// WebSocket API for real-time updates
export class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 15; // Increased max attempts
  private connectionQueue: Array<{ type: string, data: any }> = []; // Queue for messages when offline
  private isReady = false;
  
  constructor() {
    // Try to connect immediately
    setTimeout(() => this.connect(), 500);
    
    // Also connect when the window loads (provides a fallback)
    window.addEventListener('load', () => {
      if (!this.isReady) {
        setTimeout(() => this.connect(), 1000);
      }
    });
    
    // Also handle visibility changes for better reconnection
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
          console.log('Page became visible, reconnecting WebSocket...');
          this.reconnect();
        }
      }
    });
  }
  
  private connect() {
    if (this.isConnecting || (this.socket && this.socket.readyState === WebSocket.OPEN)) {
      return;
    }
    
    this.isConnecting = true;
    
    try {
      // Handle both http/https protocol conversion to ws/wss
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}, attempt ${this.reconnectAttempt + 1}`);
      
      // Close any existing socket
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnecting = false;
        this.isReady = true;
        this.reconnectAttempt = 0;
        
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        
        // Process any queued messages that accumulated while offline
        if (this.connectionQueue.length > 0) {
          console.log(`Processing ${this.connectionQueue.length} queued messages`);
          this.connectionQueue.forEach(message => {
            this.notifyListeners(message.type, message.data);
          });
          this.connectionQueue = []; // Clear the queue after processing
        }
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket received message:', message.type);
          
          // Store critical updates in case of disconnection
          if (['stats_update', 'flagged_content_update', 'ai_rules_update'].includes(message.type)) {
            // Keep latest version of critical data types in the queue
            this.connectionQueue = this.connectionQueue.filter(item => item.type !== message.type);
            this.connectionQueue.push(message);
          }
          
          this.notifyListeners(message.type, message.data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socket.onclose = (event) => {
        this.isConnecting = false;
        this.isReady = false;
        console.log(`WebSocket disconnected. Code: ${event.code}. Reason: ${event.reason || 'No reason provided'}`);
        this.scheduleReconnect();
      };
      
      this.socket.onerror = (event) => {
        this.isConnecting = false;
        console.error('WebSocket error occurred');
        
        // Force close to trigger the reconnect logic
        if (this.socket) {
          this.socket.close();
          this.socket = null;
        }
      };
    } catch (error) {
      this.isConnecting = false;
      this.socket = null;
      console.error('Error creating WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }
  
  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectAttempt++;
      
      if (this.reconnectAttempt <= this.maxReconnectAttempts) {
        // Exponential backoff with max of 30 seconds
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempt - 1), 30000);
        console.log(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${this.reconnectAttempt}/${this.maxReconnectAttempts})...`);
        
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, delay);
      } else {
        console.error(`Exceeded maximum reconnection attempts (${this.maxReconnectAttempts}). Please reload the page.`);
      }
    }
  }
  
  // Force an immediate reconnection attempt - can be called from the UI
  public reconnect() {
    console.log('Forcing WebSocket reconnection...');
    this.reconnectAttempt = 0; // Reset counter
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // If we already have a socket, close it first
    if (this.socket) {
      const oldSocket = this.socket;
      this.socket = null;
      
      try {
        if (oldSocket.readyState === WebSocket.OPEN || oldSocket.readyState === WebSocket.CONNECTING) {
          oldSocket.close();
        }
      } catch (e) {
        console.error('Error closing existing socket:', e);
      }
    }
    
    // Start a fresh connection
    this.connect();
  }
  
  // Get connection status - useful for UI indicators
  public getStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.socket) return 'disconnected';
    if (this.socket.readyState === WebSocket.CONNECTING) return 'connecting';
    if (this.socket.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }
  
  subscribe(type: string, callback: (data: any) => void) {
    // Initialize the listener set if not already done
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    // Add the callback to the set
    this.listeners.get(type)?.add(callback);
    
    // Reconnect if there's an issue with the connection
    if (!this.socket || (this.socket.readyState !== WebSocket.OPEN && this.socket.readyState !== WebSocket.CONNECTING)) {
      this.reconnect();
    }
    
    // If we have cached data for this subscription type, immediately provide it
    const cachedUpdate = this.connectionQueue.find(item => item.type === type);
    if (cachedUpdate) {
      setTimeout(() => {
        try {
          callback(cachedUpdate.data);
        } catch (error) {
          console.error(`Error in WebSocket cached update for ${type}:`, error);
        }
      }, 0);
    }
    
    // Return an unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }
  
  private notifyListeners(type: string, data: any) {
    if (this.listeners.has(type)) {
      console.log(`Notifying ${this.listeners.get(type)?.size} listeners for ${type}`);
      this.listeners.get(type)?.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${type}:`, error);
        }
      });
    } else {
      console.log(`No listeners found for ${type}`);
    }
  }
}

export const webSocketService = new WebSocketService();
