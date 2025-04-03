import { apiRequest } from "./queryClient";

// Authentication API
export const authApi = {
  login: async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    return await res.json();
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
  
  constructor() {
    this.connect();
  }
  
  private connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.notifyListeners(message.type, message.data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.socket.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting...');
      setTimeout(() => this.connect(), 3000);
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.socket?.close();
    };
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
