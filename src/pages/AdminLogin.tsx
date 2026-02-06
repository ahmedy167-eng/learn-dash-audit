import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isNetworkError } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRetryButton, setShowRetryButton] = useState(false);
  
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const handleLoginWithRetry = async (attempt = 0): Promise<void> => {
    const { error } = await signIn(email, password);
    
    if (error) {
      if (isNetworkError(error) && attempt < MAX_RETRIES) {
        toast.info(`Connection issue. Retrying... (${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        return handleLoginWithRetry(attempt + 1);
      }
      
      if (error.message.includes('Network error') || isNetworkError(error)) {
        setShowRetryButton(true);
        toast.error('Unable to connect. Please check your internet and try again.');
      } else if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.message);
      }
    } else {
      setShowRetryButton(false);
      toast.success('Welcome, Administrator!');
      navigate('/admin');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    await handleLoginWithRetry(0);
    setIsLoading(false);
  };

  const handleRetry = async () => {
    setShowRetryButton(false);
    setIsLoading(true);
    await handleLoginWithRetry(0);
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.04)_0%,_transparent_70%)]" />
      <Card className="w-full max-w-md border-primary/20 animate-fade-in relative shadow-soft">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Admin Portal</CardTitle>
          <CardDescription>EduPortal Administration</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In as Admin
            </Button>
          </form>
          
          {showRetryButton && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-muted-foreground mb-2 text-center">
                Connection failed. Please check your internet connection.
              </p>
              <Button onClick={handleRetry} variant="outline" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Retry Connection
              </Button>
            </div>
          )}
          
          <div className="mt-4 text-center">
            <a href="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              ← Back to regular login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
