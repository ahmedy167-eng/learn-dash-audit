import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const StudentLogin = () => {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useStudentAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !studentId.trim()) {
      toast.error('Please enter both your name and student ID');
      return;
    }

    setIsLoading(true);
    
    const { error } = await signIn(name, studentId);
    
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      navigate('/student-portal');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">EduPortal</span>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Student Login</CardTitle>
            <CardDescription>
              Enter your full name and student ID to access your portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  type="text"
                  placeholder="Enter your student ID"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Contact your teacher if you're having trouble logging in
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentLogin;
