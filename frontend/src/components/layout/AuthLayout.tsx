/**
 * Auth Layout Component
 * Centered layout for authentication pages
 */

import { Outlet, Link } from 'react-router-dom';
import { Atom } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent/5 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Atom className="h-8 w-8 text-primary" />
        </div>
        <span className="text-2xl font-bold">casimirQ</span>
      </Link>

      {/* Auth form container */}
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl shadow-lg p-8">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-muted-foreground">
        Quantum Circuit Simulation Platform
      </p>
    </div>
  );
}
