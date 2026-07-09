/**
 * Signup Page
 * Account registration.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup } from '@/api/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';
import { useIsAuthenticated } from '@/stores/authStore';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const signup = useSignup();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (signup.isSuccess) {
      toast.success('Welcome to casimirQ!');
      navigate('/', { replace: true });
    }
  }, [signup.isSuccess, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter an email and password');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    signup.mutate({ email, password });
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground mt-1">Start building quantum circuits</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        <Input
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />

        {signup.isError && (
          <div className="text-sm text-destructive text-center">
            {signup.error instanceof Error ? signup.error.message : 'Signup failed'}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={signup.isPending}
          disabled={signup.isPending}
        >
          {signup.isPending ? 'Creating account...' : 'Sign Up'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
