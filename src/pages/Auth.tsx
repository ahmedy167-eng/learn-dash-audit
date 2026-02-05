import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isNetworkError } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const resetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [lastAction, setLastAction] = useState<'login' | 'signup' | null>(null);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleLoginWithRetry = async (attempt = 0): Promise<void> => {
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      // Check if it's a network error and we should retry
      if (isNetworkError(error) && attempt < MAX_RETRIES) {
        toast.info(`Connection issue. Retrying... (${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        return handleLoginWithRetry(attempt + 1);
      }
      
      // Handle final errors
      if (error.message.includes('Network error') || isNetworkError(error)) {
        setShowRetryButton(true);
        setLastAction('login');
        toast.error('Unable to connect. Please check your internet and try again.');
      } else if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.message);
      }
    } else {
      setShowRetryButton(false);
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    await handleLoginWithRetry(0);
    setIsLoading(false);
  };

  const handleSignupWithRetry = async (attempt = 0): Promise<void> => {
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    
    if (error) {
      // Check if it's a network error and we should retry
      if (isNetworkError(error) && attempt < MAX_RETRIES) {
        toast.info(`Connection issue. Retrying... (${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        return handleSignupWithRetry(attempt + 1);
      }
      
      // Handle final errors
      if (error.message.includes('Network error') || isNetworkError(error)) {
        setShowRetryButton(true);
        setLastAction('signup');
        toast.error('Unable to connect. Please check your internet and try again.');
      } else if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
    } else {
      setShowRetryButton(false);
      toast.success('Account created! Please check your email to verify your account.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({ 
      fullName: signupName, 
      email: signupEmail, 
      password: signupPassword 
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    await handleSignupWithRetry(0);
    setIsLoading(false);
  };

  const handleRetry = async () => {
    setShowRetryButton(false);
    if (lastAction === 'login') {
      setIsLoading(true);
      await handleLoginWithRetry(0);
      setIsLoading(false);
    } else if (lastAction === 'signup') {
      setIsLoading(true);
      await handleSignupWithRetry(0);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = resetSchema.safeParse({ email: resetEmail });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      
      if (error) {
        if (error.message.includes('Failed to fetch')) {
          toast.error('Network error. Please check your connection and try again.');
        } else {
          toast.error(error.message);
        }
      } else {
        setResetEmailSent(true);
        toast.success('Password reset email sent! Check your inbox.');
      }
    } catch (err) {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              {resetEmailSent 
                ? 'Check your email for the reset link'
                : 'Enter your email to receive a password reset link'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetEmailSent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  We've sent a password reset link to <strong>{resetEmail}</strong>. 
                  Please check your inbox and follow the instructions.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                    setResetEmail('');
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
                <Button 
                  type="button"
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">EduPortal</CardTitle>
          <CardDescription>Education Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                <Button 
                  type="button"
                  variant="link" 
                  className="w-full text-sm"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot your password?
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {showRetryButton && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-muted-foreground mb-2 text-center">
                Connection failed. Please check your internet connection.
              </p>
              <Button 
                onClick={handleRetry} 
                variant="outline" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Retry Connection
              </Button>
            </div>
          )}
          
          <div className="mt-4 space-y-2 text-center">
            <a 
              href="/student-login" 
              className="block text-sm text-muted-foreground hover:text-primary"
            >
              Student? Login here →
            </a>
            <a 
              href="/admin-login" 
              className="block text-sm text-muted-foreground hover:text-primary"
            >
              Administrator? Sign in here →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
