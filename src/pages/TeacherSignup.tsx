import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isNetworkError } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function TeacherSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { signUp, user, signOut } = useAuth();
  const { refetchPermissions } = usePermissions();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = signupSchema.safeParse({ fullName, email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        if (isNetworkError(error) || error.message.includes('Network error')) {
          toast.error('Unable to connect. Please check your internet and try again.');
        } else if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Account created! Check your email to verify, then sign in.');
        await refetchPermissions();
        navigate('/auth');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.04)_0%,_transparent_70%)]" />
      <Card className="w-full max-w-md animate-fade-in relative">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create Teacher Account</CardTitle>
          <CardDescription>Sign up to access the EduPortal teacher tools</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
                You are already signed in as <strong className="text-foreground">{user.email}</strong>.
                Sign out first to create a new teacher account on this browser.
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => { await signOut(); }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input id="signup-name" type="text" placeholder="John Doe"
                  value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <a href="/auth" className="text-primary hover:underline">Sign in</a>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
