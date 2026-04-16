# Auto-Versioning System Prompt

## Quick Reference

### Version Bump Rules

| Commit Type                                        | Bump  | Example       |
| -------------------------------------------------- | ----- | ------------- |
| `feat`                                             | Minor | 1.0.0 → 1.1.0 |
| `fix`                                              | Patch | 1.0.0 → 1.0.1 |
| `docs`, `style`, `refactor`, `test`, `build`, `ci` | Patch | 1.0.0 → 1.0.1 |
| `perf`                                             | Minor | 1.0.0 → 1.1.0 |
| `chore`                                            | None  | No change     |
| `feat!` or `BREAKING CHANGE:`                      | Major | 1.0.0 → 2.0.0 |

### Commands

```bash
# Check current version
cat VERSION
# or
grep -A1 '"version"' package.json

# Check commits since last release
git log --oneline v1.0.0..HEAD

# Create version commit
git commit -m "feat(release): bump version to x.y.z"

# Create annotated tag
git tag -a vx.y.z -m "Release vx.y.z"

# Push with tags
git push origin main --follow-tags
```

### Workflow

1. **Before work**: Fetch & check current version
2. **During work**: Make conventional commits
3. **Ready to release**:
   - Analyze commits since last release
   - Determine version bump (major/minor/patch)
   - Update VERSION file and package.json
   - Create release commit
   - Create git tag
   - Push with tags

### Deploy Commands

```bash
# Frontend (Vite + Firebase)
cd frontend && npm run deploy

# Backend
cd backend && npm run start  # or check package.json
```

### Important Rules

- NEVER commit secrets, .env, credentials
- Use `git pull --rebase` (not merge)
- Keep commits atomic
- Reference issues: `Closes #123`
