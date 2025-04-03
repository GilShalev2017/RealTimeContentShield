import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ContentQueue from "@/pages/content-queue";
import Search from "@/pages/search";
import Login from "@/pages/login";
import { useState, useEffect } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import ProtectedRoute from "@/components/auth/protected-route";
import { Loader2 } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <Login />
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/queue">
        <ProtectedRoute>
          <ContentQueue />
        </ProtectedRoute>
      </Route>
      <Route path="/search">
        <ProtectedRoute>
          <Search />
        </ProtectedRoute>
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Simple check to verify if the server is reachable
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/auth/check', { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          // Server is available
          setIsConnecting(false);
          setConnectionError(null);
        } else {
          setConnectionError(`Server returned status: ${response.status}. Retrying...`);
          setTimeout(checkConnection, 2000); // Retry after 2 seconds
        }
      } catch (error) {
        console.error('Connection error:', error);
        setConnectionError('Unable to connect to server. Retrying...');
        setTimeout(checkConnection, 2000); // Retry after 2 seconds
      }
    };

    checkConnection();
    
    // Clean up any timeout on unmount
    return () => {
      setIsConnecting(false);
    };
  }, []);

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-semibold mb-2">Connecting to server...</h1>
          {connectionError && (
            <p className="text-destructive">{connectionError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <div className="bg-gray-50 dark:bg-gray-900 font-sans min-h-screen">
        <Router />
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;
