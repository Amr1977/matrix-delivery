# Matrix Delivery - Global Development Rules

## UI/UX Standards

### Mobile-First Development (CRITICAL)

**All new components and views MUST follow mobile-first approach:**

1. **Base styles target mobile devices** (< 768px)
   - Design for mobile viewport first
   - Use single-column layouts by default
   - Font size minimum 16px for inputs (prevents iOS zoom)
   - Touch targets minimum 44x44px (Apple HIG)

2. **Progressive enhancement for larger screens**
   - Tablet styles: `@media (min-width: 768px)`
   - Desktop styles: `@media (min-width: 1024px)`
   - Use CSS Grid and Flexbox for responsive layouts

3. **Reference implementation**: See `frontend/src/Mobile.css`
   - Copy patterns from Mobile.css for new components
   - Ensure all interactive elements meet 44x44px touch target size
   - Test on actual mobile devices, not just browser DevTools

### Matrix Theme (MANDATORY)

**Every component MUST use Matrix theme styling:**

#### Color Palette

```css
/* Primary Colors */
--matrix-black: #0a0e27;
--matrix-green: #00ff41;
--matrix-bright-green: #00ff41;
--matrix-cyan: #00ffff;
--matrix-purple: #8b5cf6;
--matrix-pink: #d946ef;

/* Accent Colors */
--matrix-red: #ff4444;
--matrix-yellow: #fbbf24;

/* Backgrounds */
- Dark base: #0a0e27
- Glassmorphism: rgba(10, 14, 39, 0.6) with backdrop-filter: blur(20px)
- Card overlays: rgba(0, 255, 65, 0.05) to rgba(0, 255, 65, 0.1)
```

#### Visual Effects

1. **Glassmorphism** - All cards and panels must have:
   - Semi-transparent background: `rgba(10, 14, 39, 0.6)`
   - Backdrop blur: `backdrop-filter: blur(20px)`
   - Subtle borders: `border: 1px solid rgba(0, 255, 65, 0.2)`

2. **Neon Glow Effects**
   - Text shadows: `text-shadow: 0 0 20px rgba(0, 255, 65, 0.5)`
   - Box shadows on hover: `box-shadow: 0 0 20px rgba(0, 255, 65, 0.3)`
   - Filter drop shadows: `filter: drop-shadow(0 0 10px currentColor)`

3. **Gradients**
   - Headings: `linear-gradient(135deg, var(--matrix-bright-green), #00ffff)`
   - Buttons: `linear-gradient(135deg, #8b5cf6, #7c3aed)`
   - Cards: `linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(217, 70, 239, 0.3))`

4. **Animations**
   - Smooth transitions: `transition: all 0.3s ease`
   - Hover effects: `transform: translateY(-3px)`
   - Active states: `transform: scale(0.97)`

#### Typography

- Headings use gradient text with `-webkit-background-clip: text`
- Body text: white with varying opacity (0.6-1.0)
- Labels: rgba(255, 255, 255, 0.7)
- Use text-transform: uppercase with letter-spacing for small UI elements

#### Buttons

```css
/* Primary (Green) */
background: linear-gradient(135deg, var(--matrix-bright-green), #00ff41);
color: #000;
box-shadow: 0 4px 16px rgba(0, 255, 65, 0.3);

/* Secondary (Purple) */
background: linear-gradient(135deg, #8b5cf6, #7c3aed);
color: white;
box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);

/* Ghost (Outline) */
background: rgba(0, 255, 65, 0.1);
border: 2px solid rgba(0, 255, 65, 0.3);
color: var(--matrix-bright-green);
```

### Example Component Structure

```jsx
// Component with Matrix theme
<div className="component-name">
  {/* Header with gradient text */}
  <h1
    style={{
      background:
        "linear-gradient(135deg, var(--matrix-bright-green), #00ffff)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    }}
  >
    Title
  </h1>

  {/* Glassmorphism card */}
  <div
    style={{
      background: "rgba(10, 14, 39, 0.6)",
      border: "1px solid rgba(0, 255, 65, 0.2)",
      borderRadius: "1rem",
      padding: "1.5rem",
      backdropFilter: "blur(20px)",
    }}
  >
    Content
  </div>
</div>
```

## Code Quality

### Clean Code Principles

1. **Meaningful Names**: Use descriptive variable/function names
2. **Single Responsibility**: Each function should do one thing well
3. **DRY**: Don't Repeat Yourself - extract reusable logic
4. **Comments**: Explain WHY, not WHAT (code should be self-documenting)

### TypeScript Adoption

- Gradually migrate JavaScript files to TypeScript
- Use strict type checking
- Define interfaces for all props and state
- Avoid `any` type - use proper types or `unknown`

## Documentation (MANDATORY)

### DOCS/ Directory

**All significant features MUST be documented in `DOCS/`:**

1. **Create documentation for**:
   - New features
   - Bug fixes that change behavior
   - Architecture decisions
   - API changes
   - UI/UX patterns

2. **Documentation format**:

   ```markdown
   # Feature Name

   ## Overview

   Brief description

   ## Changes Made

   - List of changes

   ## Files Modified

   - File paths with descriptions

   ## Testing

   How to verify/test
   ```

3. **Keep docs updated**: Update relevant docs when modifying features

## Testing

### BDD Testing (Polymorphic Approach - CRITICAL)

**ALWAYS USE POLYMORPHIC BDD APPROACH FOR BDD/TDD.**

#### Core Principle

- **One Feature File**: Write Gherkin scenarios once in `tests/features/shared/`
- **Multiple Contexts**: Run the _same_ scenarios against multiple layers:
  1.  **API Level** (Fast, checking logic/state via HTTP)
  2.  **E2E Level** (Comprehensive, checking UI/UX via Playwright)

#### Implementation Structure

```
tests/features/
  └── shared/                   # <-- Single source of truth
       └── my_feature.feature

tests/step_definitions/
  ├── api/                      # API-specific implementation
  │   └── my_feature_steps.js
  └── e2e/                      # UI-specific implementation
      └── my_feature_steps.js
```

#### Test Requirements

- **All new features contexts** MUST use this approach
- Do NOT create separate feature files for backend vs frontend unless logic is purely internal
- Tests must pass in both contexts before deployment

## Security

### Best Practices

1. **Input Validation**: Validate all user inputs
2. **Authentication**: Use httpOnly cookies for tokens
3. **Authorization**: Verify user permissions on all endpoints
4. **SQL Injection**: Use parameterized queries
5. **XSS Prevention**: Sanitize user-generated content
6. **HTTPS**: Enforce secure connections in production

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing (integration + UI)
- [ ] Documentation updated in DOCS/
- [ ] Mobile responsiveness verified
- [ ] Matrix theme applied consistently
- [ ] Security vulnerabilities addressed
- [ ] Performance optimized

---

**Last Updated**: 2025-12-30
**Maintained By**: Development Team
