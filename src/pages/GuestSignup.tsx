import { useState } from 'react';
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GuestSignup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, guest } = useGuestAuth();
  const navigate = useNavigate();

  if (guest) return <Navigate to="/guest/quizzes" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error, pendingApproval, message } = await signUp(username.toLowerCase().trim(), password, displayName.trim());
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (pendingApproval) {
      toast.success(message || 'Account created. Pending admin approval.', { duration: 8000 });
      navigate('/guest-login');
    } else {
      toast.success('Account created!');
      navigate('/guest/quizzes');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <CardTitle>Create Guest Account</CardTitle>
          <CardDescription>Sign up to take quizzes. New accounts require admin approval before you can sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Your Name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={loading} required minLength={2} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} required pattern="[a-z0-9_]{3,30}" placeholder="3-30 chars: a-z, 0-9, _" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required minLength={8} placeholder="At least 8 characters" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/guest-login" className="text-primary underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
