# Contributing to Matrix Heroes

<p align="center">
  <img src="artifacts/images/screenshot.png" alt="Matrix Heroes Screenshot" width="600">
</p>

Welcome to Matrix Heroes! We're an open-source delivery and ride-hailing platform, and we're excited that you're interested in contributing. Whether you're a developer, translator, tester, or just someone who wants to help — **everyone is welcome**.

---

## Ways to Contribute

| Type                 | Description                                  |
| -------------------- | -------------------------------------------- |
| 💻 **Code**          | Fix bugs, add features, improve performance  |
| 🌍 **Translations**  | Help translate the app to multiple languages |
| 📝 **Documentation** | Improve guides, README, API docs             |
| 🐛 **Bug Reports**   | Open issues with clear reproduction steps    |
| 🧪 **Testing**       | Test new features and report issues          |

---

## Development Setup

### Requirements

- Node.js 20+
- PostgreSQL (local or cloud like Neon, Supabase)
- Firebase project (console.firebase.google.com)
- Redis (for failover system)

### Quick Start

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/matrix-delivery.git
cd matrix-delivery

# 3. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 4. Set up environment
cp .env.example .env
# Edit .env with your local settings

# 5. Run development servers
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Verify Your Setup

```bash
# Backend tests
npm run test

# Frontend build
cd frontend && npm run build
```

---

## Branching Strategy

| Branch      | Purpose                                     |
| ----------- | ------------------------------------------- |
| `master`    | Stable, production-ready (protected)        |
| `feature/*` | New features (e.g., `feature/user-profile`) |
| `fix/*`     | Bug fixes (e.g., `fix/login-redirect`)      |

Create a branch from `master`:

```bash
git checkout -b feature/your-feature-name
```

---

## Commit Message Convention

We use **Conventional Commits**. This helps us generate changelogs and versions automatically.

| Type        | Description              |
| ----------- | ------------------------ |
| `feat:`     | New feature              |
| `fix:`      | Bug fix                  |
| `docs:`     | Documentation update     |
| `chore:`    | Maintenance, refactoring |
| `test:`     | Adding/updating tests    |
| `refactor:` | Code restructure         |
| `perf:`     | Performance improvement  |
| `build:`    | Build system changes     |
| `ci:`       | CI/CD configuration      |

**Examples:**

```
feat: add user profile page
fix: resolve login redirect issue
docs: update API documentation
chore: clean up unused dependencies
```

---

## How to Claim an Issue

1. Browse the [Issues](https://github.com/Amr1977/matrix-delivery/issues)
2. Find one you're interested in (look for `good first issue` label)
3. Comment: **"I'd like to work on this"**
4. A maintainer will assign it to you within **48 hours**

---

## Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch from `master`
3. **Make your changes** following our coding standards
4. **Add tests** if applicable
5. **Run checks locally:**

   ```bash
   # Backend tests
   npm run test

   # Frontend build
   cd frontend && npm run build
   ```

6. **Submit PR** with clear description:
   - What does this PR do?
   - Why is it needed?
   - How can someone test it?
   - Related issue (e.g., `Closes #123`)

7. **Wait for review** — we aim to review within **5 business days**

---

## Coding Standards

### Code Style

- ESLint + Prettier (automatic on save)
- TypeScript with strict mode for new files
- Meaningful variable/function names
- Comment complex logic, not obvious code

### Testing

- New features should have tests
- Bug fixes should include regression tests
- Always run tests before committing

### Test ID Requirements

All testable elements must use `data-testid` attributes for i18n-ready testing:

```tsx
// ✅ Good - Language-independent
<button data-testid="submit-button">Submit</button>

// ❌ Avoid - Breaks with localization
<button>Submit</button>
```

---

## Contributor Recognition

🌟 **Every contributor matters!** 🌟

All contributors will be:

- Listed in the [README contributors section](README.md#contributors)
- Credited in [CHANGELOG.md](CHANGELOG.md)
- Thanked in PR merge comments

---

## Getting Help

| Channel                                                                      | Use for                          |
| ---------------------------------------------------------------------------- | -------------------------------- |
| [GitHub Discussions](https://github.com/Amr1977/matrix-delivery/discussions) | Questions, ideas, community chat |
| [GitHub Issues](https://github.com/Amr1977/matrix-delivery/issues)           | Bug reports, feature requests    |
| [SECURITY.md](SECURITY.md)                                                   | Vulnerability reporting          |

---

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) to keep our community friendly and welcoming.

---

_Last updated: 2026-04-16_
