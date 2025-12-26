# 🎓 Matrix Delivery: 21-Day Intensive Learning Plan

> **Goal**: Master full-stack development to complete Matrix Delivery MVP.
> **Constraint**: Limited Internet (Offline Focus).
> **Prerequisites**: Download resources using `scripts/download-free-learning-resources.ps1`.

---

## 📅 Week 1: Core Fundamentals (Offline)

**Focus**: Solidify Node.js & React basics to understand the current monolithic code.

### Day 1-2: Node.js & Express Deep Dive
- **Read**: *Node.js Best Practices* (Cloned Repo)
    - Sections: Project Structure, Error Handling, Coding Style.
- **Task**: Analyze `backend/server.js` vs `backend/app.js`.
    - Identify Middleware chain.
    - Trace a single request from Route -> Controller -> DB.
- **Practice**: Create a mini-server with 3 routes (GET, POST, Error) without copying code.

### Day 3-4: React Hooks & State
- **Read**: *React Documentation* (Cloned Repo)
    - Topics: `useState`, `useEffect`, `useContext`, `useReducer`.
- **Task**: Refactor a component in `frontend/src/components/` to use a custom hook.
- **Practice**: Build a "Counter" that saves to `localStorage` using a custom hook.

### Day 5: Database Design (PostgreSQL)
- **Read**: *PostgreSQL Documentation* (PDF)
    - Topics: Constraints, Foreign Keys, Indexes.
- **Task**: Diagram the `orders` and `users` table relationship.
- **Practice**: Write raw SQL to find "All drivers near a specific location" (PostGIS query).

### Day 6-7: Testing Fundamentals (Jest)
- **Read**: *JavaScript Testing Best Practices* (Cloned Repo)
- **Task**: Write a unit test for `utils/geoUtils.js` (or similar utility).
- **Practice**: Achieve 100% coverage on one utility file.

---

## 📅 Week 2: Architecture & Refactoring

**Focus**: Breaking down the monoliths safely.

### Day 8-10: Advanced Express Patterns
- **Read**: *System Design Primer* (Cloned Repo)
- **Task**: Extract `routes/auth.js` from `backend/app.js`.
- **Concept**: Dependency Injection vs Module Imports.

### Day 11-12: React Patterns & Performance
- **Read**: *Clean Code TypeScript* (Cloned Repo) - Apply concepts to JS.
- **Task**: Break `frontend/src/App.js` into feature-based modules (e.g., `AuthModule`, `OrderModule`).
- **Concept**: Lazy Loading (`React.lazy`) for route splitting.

### Day 13-14: BDD with Cucumber
- **Read**: *Cucumber Documentation* (Cloned Repo)
- **Task**: Write a `.feature` file for "Driver accepts an order".
- **Practice**: Implement the Step Definitions for the above feature.

---

## 📅 Week 3: Production Readiness

**Focus**: Security, Deployment, and Real-world issues.

### Day 15-16: Security Hardening
- **Read**: *OWASP Top 10 Cheat Sheet* (Cloned Repo)
- **Audit**: Check code for SQL Injection (are we using parameterized queries everywhere?).
- **Task**: Implement Rate Limiting on the Login route.

### Day 17-18: Real-time Communication (Socket.IO)
- **Study**: Review `backend/config/socket.js`.
- **Task**: Create a sequence diagram of the "Order Status Update" flow.
- **Practice**: Build a tiny chat app bridging two browser tabs.

### Day 19-20: CI/CD & DevOps
- **Read**: *The Twelve-Factor App* (Manifesto).
- **Task**: Write a `deploy.ps1` script that automates backing up the DB before deployment.

### Day 21: Final Review & Capstone
- **Objective**: Fix one MAJOR bug from the "Critical Issues" list in the Mastery Report.
- **Deliverable**: A Pull Request with tests, code, and documentation.

---

## 📚 Resource Lookup Table (Offline)

| Topic | Local Path (Relative to Project Root) | file |
|-------|---------------------------------------|------|
| **Node.js** | `node_modules/express/readme.md` (Check node_modules docs!) | |
| **Testing** | `docs/testing/cucumber-guide.pdf` (If downloaded) | |
| **Security** | `docs/security/OWASP-CheatSheet.md` | |

> **Tip**: Use `grep` or `Ctrl+Shift+F` in VS Code to search your local codebase. It is the best textbook you have!
