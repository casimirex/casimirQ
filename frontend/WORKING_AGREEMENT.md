# casimirQ Frontend Working Agreement

## Purpose

This document defines how we will collaborate on building the casimirQ frontend. It ensures consistency, quality, and smooth teamwork.

---

## 1. Code Quality Standards

### 1.1 TypeScript Rules
- **Strict mode enabled** - no `any` types without justification
- **Explicit return types** on all functions
- **Interface over Type** for object shapes
- **No magic numbers** - use named constants
- **Optional chaining** instead of null checks where appropriate

```typescript
// ✅ Good
interface GateNodeData {
  label: string;
  qubits: number[];
  params?: Record<string, number>;
}

function calculateProbability(statevector: Complex[]): number {
  return statevector.reduce((sum, amp) => sum + amp.magnitude ** 2, 0);
}

// ❌ Bad
function calcProb(sv: any) {
  return sv.reduce((a: any, b: any) => a + b.mag ** 2, 0);
}
```

### 1.2 Component Standards
- **Single Responsibility** - one component = one purpose
- **Props interface** required for every component
- **Named exports** over default exports
- **Hook pattern** for stateful logic (separate from UI)
- **Max 150 lines** per component (refactor if larger)

```typescript
// ✅ Good
interface GateNodeProps {
  data: GateNodeData;
  selected: boolean;
  onClick: () => void;
}

export function GateNode({ data, selected, onClick }: GateNodeProps) {
  // Component logic here
}

// ❌ Bad
export default function Node(props: any) {
  // Too large, no types
}
```

### 1.3 File Naming
- **PascalCase** for components (`GateNode.tsx`)
- **camelCase** for utilities (`formatStatevector.ts`)
- **kebab-case** for CSS files (`gate-node.module.css`)
- **Index exports** for public API of folders

### 1.4 Code Formatting
- **Prettier** for formatting (configured in project)
- **ESLint** for linting (strict rules)
- **Pre-commit hooks** run checks before commit
- **No trailing whitespace**
- **2 spaces indentation**

---

## 2. Project Architecture

### 2.1 Feature-Based Organization
```
src/features/
├── circuitBuilder/           # Feature folder
│   ├── components/          # Feature-specific components
│   │   ├── GateNode.tsx
│   │   ├── CircuitCanvas.tsx
│   │   └── index.ts
│   ├── hooks/               # Feature-specific hooks
│   │   ├── useCircuit.ts
│   │   └── index.ts
│   ├── stores/              # Feature state (Zustand)
│   │   └── circuitStore.ts
│   ├── utils/               # Feature utilities
│   │   └── circuitHelpers.ts
│   ├── types/               # Feature types
│   │   └── circuit.types.ts
│   └── index.ts             # Public API
```

### 2.2 Shared Components
- Put truly **reusable** components in `src/components/ui/`
- Document in **Storybook**
- Maintain **backward compatibility** (semver)
- **Never** import from other features

### 2.3 State Management Rules
- **React Query** for server state (caching, syncing)
- **Zustand** for client state (UI, auth)
- **React Flow** manages its own graph state
- **No prop drilling** - use stores or React context
- **Selectors** for derived state

---

## 3. Git Workflow

### 3.1 Branch Strategy
```
main (production) ─────────────────────────────▶
    │
    ├── develop (integration) ─────────────────▶
    │   │
    │   ├── feature/circuit-builder ──────────▶
    │   ├── feature/simulation-panel ─────────▶
    │   └── bugfix/websocket-reconnect ───────▶
    │
    └── hotfix/auth-token-expiry ─────────────▶
```

### 3.2 Branch Naming
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation
- `test/description` - Test additions

### 3.3 Commit Messages
Use **Conventional Commits**:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Build/config changes

Examples:
```
feat(circuit): add drag-and-drop gate placement

- Implemented React Flow custom nodes
- Added snap-to-grid functionality
- Gate palette with search

fix(api): handle JWT token refresh on 401

refactor(stores): split circuit store into smaller stores
```

### 3.4 Pull Request Standards
- **PR title** follows commit convention
- **Description template** filled out
- **Screenshots/Videos** for UI changes
- **All tests passing**
- **Code review approved** by at least 1 person
- **No merge conflicts**
- **Squash merge** to keep history clean

### 3.5 PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## How Has This Been Tested?
Describe testing approach

## Screenshots (if UI change)
Add screenshots

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console errors
```

---

## 4. Testing Requirements

### 4.1 Test Coverage Goals
- **Components**: 80%+ coverage
- **Hooks**: 80%+ coverage
- **Utils**: 90%+ coverage
- **Stores**: 70%+ coverage
- **Integration tests**: Critical user flows
- **E2E tests**: Happy paths + error cases

### 4.2 Test Structure
```typescript
// Component test pattern
describe('GateNode', () => {
  // Setup
  const defaultProps = { ... };

  it('renders gate label', () => {
    render(<GateNode {...defaultProps} />);
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<GateNode {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('gate-node'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows selected state', () => {
    render(<GateNode {...defaultProps} selected={true} />);
    expect(screen.getByTestId('gate-node')).toHaveClass('selected');
  });
});
```

### 4.3 Testing Rules
- **Test behavior**, not implementation
- **Mock external dependencies** (API calls)
- **Use test IDs** over CSS selectors
- **Arrange-Act-Assert** pattern
- **One assertion per test** (ideally)

### 4.4 Storybook for Components
- Every UI component has a story
- Show all variants/states
- Include documentation
- Visual regression testing

---

## 5. UI/UX Standards

### 5.1 Design Principles
- **Dark theme** - easier on eyes for long sessions
- **High contrast** - accessibility first
- **Consistent spacing** - 4px grid system
- **Smooth animations** - 300ms transitions
- **Clear feedback** - loading states, success/error messages

### 5.2 Component States
Every interactive element must handle:
- **Default** - Normal state
- **Hover** - Mouse over
- **Active** - Clicking/pressed
- **Focus** - Keyboard navigation
- **Disabled** - Not available
- **Loading** - Processing
- **Error** - Something went wrong

### 5.3 Responsive Breakpoints
```
sm: 640px   - Mobile
md: 768px   - Tablet
lg: 1024px  - Desktop
xl: 1280px  - Large desktop
2xl: 1536px - Extra large
```

Circuit builder minimum width: **1024px** (requires desktop)

### 5.4 Accessibility Requirements
- **WCAG 2.1 AA** compliance
- **Keyboard navigation** - full functionality
- **ARIA labels** on all interactive elements
- **Color contrast** 4.5:1 minimum
- **Focus indicators** visible
- **Screen reader tested**

---

## 6. Performance Standards

### 6.1 Bundle Size
- **Initial load** < 200KB gzipped
- **Code split** by route and feature
- **Lazy load** heavy components (charts, 3D)
- **Tree shake** unused code

### 6.2 Runtime Performance
- **60fps** animations
- **First Contentful Paint** < 1.5s
- **Time to Interactive** < 3s
- **Lighthouse score** 90+

### 6.3 Optimization Rules
- **Memoize expensive calculations** (useMemo)
- **Prevent unnecessary re-renders** (memo, useCallback)
- **Virtualize long lists**
- **Debounce rapid events** (resize, scroll)
- **Throttle API calls**

---

## 7. Documentation Standards

### 7.1 Code Documentation
- **JSDoc** for functions and interfaces
- **README.md** for each feature folder
- **Complex logic** explained with comments
- **TODO/FIXME** markers with issue numbers

```typescript
/**
 * Calculates the probability of measuring a specific state
 * @param statevector - Complex amplitudes of the quantum state
 * @param state - Binary string representing the basis state (e.g., "101")
 * @returns Probability between 0 and 1
 * @throws Error if state length doesn't match qubit count
 */
function calculateStateProbability(
  statevector: Complex[],
  state: string
): number {
  // Implementation
}
```

### 7.2 User Documentation
- **Getting Started** guide
- **Feature tutorials** with screenshots
- **Video demos** for complex workflows
- **FAQ** section
- **Troubleshooting** guide

### 7.3 Storybook Stories
Every component must have:
- **Default story** - basic usage
- **Variants story** - all states/props
- **Documentation** - usage examples
- **Play function** - interactive demo

---

## 8. Communication

### 8.1 Daily Updates
- Brief status update on progress
- Blockers mentioned immediately
- Questions asked early

### 8.2 Code Reviews
- **Constructive feedback** - suggest improvements
- **Explain reasoning** - why not just what
- **Learn from reviews** - apply feedback
- **Approve when ready** - don't block unnecessarily

### 8.3 When to Ask for Help
- Stuck for > 30 minutes
- Unclear requirements
- Architecture decisions
- Performance issues

---

## 9. Definition of Done

A feature is **Done** when:

- [ ] Code written and self-reviewed
- [ ] Tests written and passing (80%+ coverage)
- [ ] Storybook stories added
- [ ] Documentation updated
- [ ] PR reviewed and approved
- [ ] Merged to develop
- [ ] No console errors/warnings
- [ ] Works in target browsers
- [ ] Responsive design verified
- [ ] Accessibility checked

---

## 10. Tools We Use

| Purpose | Tool |
|---------|------|
| Build | Vite |
| Framework | React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand + React Query |
| Testing | Vitest + RTL + Playwright |
| Docs | Storybook |
| Linting | ESLint + Prettier |
| Icons | Lucide React |
| Charts | Recharts |
| 3D | Three.js |

---

## Agreement

By working on this project, we agree to:
1. Follow these standards
2. Keep code quality high
3. Help each other learn
4. Communicate openly
5. Deliver great UX

---

**Version:** 1.0  
**Last Updated:** 2026-06-27  
**Next Review:** After Phase 2 completion
