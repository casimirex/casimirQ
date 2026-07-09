/**
 * Not Found Page
 * 404 error page for unknown routes
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Home, Atom } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
      {/* Decorative atom */}
      <div className="relative">
        <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Atom className="h-16 w-16 text-primary" />
        </div>
        {/* Orbiting electrons effect */}
        <div className="absolute inset-0 h-32 w-32">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2">
            <div className="h-2 w-2 rounded-full bg-accent" />
          </div>
          <div className="absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2">
            <div className="h-2 w-2 rounded-full bg-quantum-gate-h" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-quantum-gate-h">
          404
        </h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          The quantum state you're looking for seems to have collapsed into a
          different eigenstate. Let's return to a known basis.
        </p>
      </div>

      <div className="flex gap-4">
        <Link to="/">
          <Button leftIcon={<Home className="h-4 w-4" />}>Return Home</Button>
        </Link>
        <Link to="/circuits">
          <Button variant="outline">Build Circuit</Button>
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        Error code: <code className="font-mono bg-accent px-1 rounded">QUANTUM_STATE_UNDEFINED</code>
      </p>
    </div>
  );
}
