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
    const res = await apiRequest("POST", "/api/news/fetch");
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
  
  constructor() {
    // Create a delayed connection to prevent race conditions
    setTimeout(() => this.connect(), 1000);
  }
  
  private connect() {
    if (this.isConnecting || this.socket?.readyState === WebSocket.OPEN) {
      return;
    }
    
    this.isConnecting = true;
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.notifyListeners(message.type, message.data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socket.onclose = (event) => {
        this.isConnecting = false;
        console.log(`WebSocket disconnected. Code: ${event.code}. Reason: ${event.reason}`);
        this.scheduleReconnect();
      };
      
      this.socket.onerror = (error) => {
        this.isConnecting = false;
        console.error('WebSocket error:', error);
        // Don't call close here, as the onclose handler will be called automatically
      };
    } catch (error) {
      this.isConnecting = false;
      console.error('Error creating WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }
  
  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      console.log('Scheduling WebSocket reconnection...');
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 5000);
    }
  }
  
  subscribe(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)?.add(callback);
    
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }
  
  private notifyListeners(type: string, data: any) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)?.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${type}:`, error);
        }
      });
    }
  }
}

export const webSocketService = new WebSocketService();
