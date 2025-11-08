# 🤝 Contributing to Matrix Delivery Platform

Thank you for your interest in contributing to **Matrix Delivery Platform**!  
We’re building an open-source delivery ecosystem where freedom and fairness come first.

---

## 🧰 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/Amr1977/matrix-delivery.git
cd matrix-delivery
```

### 2. Install dependencies and start servers
**Quick setup (Linux/Mac):**
```bash
./start_all.sh
```
This script will:
- Install backend and frontend dependencies
- Start the backend server on port 5000
- Start the frontend server on port 3000

**Manual setup:**
Backend:
```bash
cd backend
npm install
npm run dev
```
Frontend (in a new terminal):
```bash
cd frontend
npm install
npm start
```

**Windows users:**
Use the provided PowerShell scripts:
- `.\dev-setup.ps1` - Install dependencies
- `.\start-backend.ps1` - Start backend
- `.\start-frontend.ps1` - Start frontend
- `.\start-servers.ps1` - Start both servers

---

## 🧱 Coding Guidelines
- Use **ESLint + Prettier** for consistent formatting.
- Follow **MVC structure** for backend code.
- Keep React components modular, and avoid logic duplication.
- Write clear commit messages using the format:
  ```
  [type]: short description
  ```
  Example:
  ```
  feat(auth): add password reset API
  ```

---

## 🧪 Testing
We have multiple layers of testing:

- **Backend unit/integration tests:** Jest and Supertest
  ```bash
  cd backend
  npm test
  ```

- **Frontend unit tests:** Jest (via Create React App)
  ```bash
  cd frontend
  npm test
  ```

- **End-to-end (E2E) tests:** Cucumber with Playwright
  ```bash
  npm test  # From project root
  ```

Please ensure new features include appropriate test coverage across all layers.

---

## 🌍 Collaboration
- Discuss features or issues in **GitHub Discussions** before large changes.
- Tag maintainers for reviews when PRs are ready.
- Respect the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

---

## 🏷️ Good First Issues
New to the project? Check out issues labeled:
- `good first issue`
- `help wanted`
- `priority: high`

---

## 🧭 Philosophy
This project exists to **empower delivery workers and customers** — it’s a community, not a corporation.  
We welcome your ideas, improvements, and open-source spirit.

> “Delivering freedom, one route at a time.”
