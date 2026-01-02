# Quality Assurance (QA) System & Workflows

## Overview

We have established a robust "Safety Net" to ensure code quality and stability. This system operates at two levels:

1.  **Local Pre-commit Hooks**: Prevents bad code from being committed.
2.  **Continuous Integration (CI)**: Verifies every push and pull request.

---

## 1. Local Safety Net (Pre-commit)

We use [Husky](https://typicode.github.io/husky/#/) and [lint-staged](https://github.com/okonet/lint-staged) to intercept commits.

### How it Works

When you run `git commit`:

1.  **Husky** triggers the `pre-commit` hook (located in `.husky/pre-commit`).
2.  **lint-staged** runs specifically on the _staged_ (changed) files.
3.  **Config**: Defined in `.lintstagedrc.json`.

### Rules (configured in `.lintstagedrc.json`)

- **JS/TS Files** (`*.js`, `*.jsx`, `*.ts`, `*.tsx`): Runs `eslint --fix`.
  - _Effect_: Automatically fixes formatting errors and blocks the commit if there are unfixable logic errors (e.g., unused variables, undefined components).
- **Other Files** (`*.json`, `*.md`, `*.yml`): Runs `prettier --write` (if valid) to ensure consistent formatting.

### Bypass

If you absolutely must commit code that fails verification (not recommended), you can use:

```bash
git commit -m "msg" --no-verify
```

---

## 2. Continuous Integration (CI) Pipeline

Ref: `.github/workflows/ci.yml`

Our CI pipeline runs on GitHub Actions. It triggers automatically on:

- `push` to `main`, `master`, or `develop`.
- `pull_request` to those branches.

### Workflow Jobs

#### A. `quality-check` (Lint & Type Check)

- **Goal**: Ensure static code quality.
- **Steps**:
  - Installs dependencies.
  - Runs `npm run lint`.
  - (Optional) Runs `tsc` for type checking.

#### B. `backend-tests` (Integration Tests)

- **Goal**: Verify backend logic with real databases.
- **Services**:
  - **PostgreSQL**: `matrix_delivery_test` DB.
  - **Redis**: For caching/queue tests.
- **Steps**:
  - Installs dependencies.
  - Runs `npm run test:backend`.
  - Sets `NODE_ENV=test` and DB credentials.

#### C. `frontend-tests` (Unit Tests)

- **Goal**: Verify frontend components.
- **Steps**:
  - Installs dependencies.
  - Runs `npm run test:frontend:ci`.
  - Sets `CI=true` (forces Jest to run once and exit, not watch mode).

---

## 3. Setup for New Developers

The setup is automated. When a new developer clones the repo and runs:

```bash
npm install
```

The `prepare` script in `package.json` executes `husky install`, setting up the git hooks automatically.
