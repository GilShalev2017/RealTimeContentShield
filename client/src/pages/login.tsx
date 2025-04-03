import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

// Login form validation schema
const loginSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Parse return URL from query string if present
  const params = new URLSearchParams(location.split('?')[1]);
  const returnUrl = params.get('returnUrl') || '/';
  
  // Setup form with validation
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(returnUrl);
    }
  }, [isAuthenticated, isLoading, navigate, returnUrl]);

  // Handle form submission
  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.username, data.password);
      toast({
        title: 'Login successful',
        description: 'Welcome back!',
      });
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Invalid username or password',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Login Form */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Log in</CardTitle>
            <CardDescription>
              Enter your credentials to access the content moderation platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging in...' : 'Log in'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="text-center text-sm text-gray-500">
            <p>For testing, use username: admin, password: password123</p>
          </CardFooter>
        </Card>

        {/* Welcome Information */}
        <div className="hidden md:block space-y-6 text-center md:text-left">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              AI-Powered Content Moderation
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Automatically identify and filter inappropriate content in real-time.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span className="text-primary-600 dark:text-primary-300">✓</span>
              </div>
              <p>Smart content filtering with advanced AI</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span className="text-primary-600 dark:text-primary-300">✓</span>
              </div>
              <p>Real-time content moderation with Kafka</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span className="text-primary-600 dark:text-primary-300">✓</span>
              </div>
              <p>Detailed analytics dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}