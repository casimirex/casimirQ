/**
 * Login Page
 * Authentication page for users
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '@/api/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';
import { useIsAuthenticated } from '@/stores/authStore';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const login = useLogin();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle login success
  useEffect(() => {
    if (login.isSuccess) {
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    }
  }, [login.isSuccess, navigate]);

  // Handle login errors
  useEffect(() => {
    if (login.isError) {
      toast.error('Invalid credentials. Please try again.');
    }
  }, [login.isError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    login.mutate({ email, password });
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground mt-1">
          Sign in to your account to continue
        </p>
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
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {login.isError && (
          <div className="text-sm text-destructive text-center">
            Invalid credentials. Please try again.
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={login.isPending}
          disabled={login.isPending}
        >
          {login.isPending ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Demo credentials:</p>
        <p className="font-mono text-xs mt-1">admin@example.com / admin123</p>
      </div>
    </div>
  );
}
