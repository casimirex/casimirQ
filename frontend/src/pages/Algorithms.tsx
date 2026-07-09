/**
 * Algorithms Page
 * Pre-built quantum algorithms library
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  BookOpen,
  Play,
  Copy,
  Sparkles,
  Binary,
  Search,
  Shield,
  Key,
} from 'lucide-react';

const algorithms = [
  {
    id: 'deutsch-jozsa',
    name: 'Deutsch-Jozsa Algorithm',
    description: 'Determines if a function is constant or balanced with a single query.',
    qubits: 3,
    complexity: 'O(1)',
    category: 'Oracular',
    icon: Binary,
  },
  {
    id: 'grover',
    name: "Grover's Algorithm",
    description: 'Searches an unsorted database with quadratic speedup.',
    qubits: 4,
    complexity: 'O(√N)',
    category: 'Search',
    icon: Search,
  },
  {
    id: 'shor',
    name: "Shor's Algorithm",
    description: 'Factors integers exponentially faster than classical algorithms.',
    qubits: 8,
    complexity: 'O((log N)³)',
    category: 'Cryptography',
    icon: Key,
  },
  {
    id: 'bb84',
    name: 'BB84 Protocol',
    description: 'Quantum key distribution for secure communication.',
    qubits: 2,
    complexity: 'O(1)',
    category: 'Cryptography',
    icon: Shield,
  },
  {
    id: 'qft',
    name: 'Quantum Fourier Transform',
    description: 'Transform used in many quantum algorithms including Shor\'s.',
    qubits: 4,
    complexity: 'O(n²)',
    category: 'Transform',
    icon: Sparkles,
  },
  {
    id: 'vqe',
    name: 'Variational Quantum Eigensolver',
    description: 'Hybrid algorithm for finding ground state energy of molecules.',
    qubits: 6,
    complexity: 'Iterative',
    category: 'Chemistry',
    icon: Sparkles,
  },
];

const categories = ['All', 'Oracular', 'Search', 'Cryptography', 'Transform', 'Chemistry'];

export function Algorithms() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quantum Algorithms</h1>
          <p className="text-muted-foreground mt-1">
            Pre-built algorithms to jumpstart your quantum computing journey
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={cat === 'All' ? 'default' : 'outline'}
            size="sm"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Algorithm grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {algorithms.map((algo) => {
          const Icon = algo.icon;
          return (
            <Card key={algo.id} className="glass hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-accent">
                    {algo.category}
                  </span>
                </div>
                <CardTitle className="text-lg mt-3">{algo.name}</CardTitle>
                <CardDescription>{algo.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>{algo.qubits} qubits</span>
                  <span>Complexity: {algo.complexity}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    leftIcon={<Copy className="h-4 w-4" />}
                  >
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    leftIcon={<Play className="h-4 w-4" />}
                  >
                    Run
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Documentation link */}
      <Card className="glass border-primary/20">
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Want to learn more?</h3>
              <p className="text-sm text-muted-foreground">
                Explore our documentation and tutorials on quantum algorithms
              </p>
            </div>
          </div>
          <Button variant="outline">View Documentation</Button>
        </CardContent>
      </Card>
    </div>
  );
}
