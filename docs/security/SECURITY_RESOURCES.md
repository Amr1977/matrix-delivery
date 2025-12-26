# Offline Security Resources

This document contains curated summaries of essential security resources, "fetched" for offline reference.

---

## 1. OWASP Top 10 (2024 Status)
*Based on the 2021 standard, confirmed as still relevant for 2024.*

1.  **Broken Access Control**: Users can act outside of their intended permissions.
    *   *Fix*: Implement strict primary_role-Based Access Control (RBAC). Deny by default.
2.  **Cryptographic Failures**: Protecting data in transit and at rest.
    *   *Fix*: Use TLS 1.3, strong bcrypt/argon2 hashing for passwords, and never store cleartext secrets.
3.  **Injection**: SQL, NoSQL, OS command injection.
    *   *Fix*: Use parameterized queries (like `$1` in `pg`). Avoid `eval()` and `exec()`.
4.  **Insecure Design**: Risks related to design flaws.
    *   *Fix*: Threat modeling, secure design patterns over "patching later".
5.  **Security Misconfiguration**: Default accounts, verbose error messages, open cloud storage.
    *   *Fix*: Harden headers (`helmet`), remove default accounts, disable verbose errors in production.
6.  **Vulnerable and Outdated Components**: Using old libraries.
    *   *Fix*: Run `npm audit` and `npm update` regularly.
7.  **Identification and Authentication Failures**: Weak passwords, credential stuffing.
    *   *Fix*: MFA, strong password policies, rate limiting login attempts.
8.  **Software and Data Integrity Failures**: CI/CD pipeline risks, untrusted updates.
    *   *Fix*: Sign code, verify checksums, secure CI/CD.
9.  **Security Logging and Monitoring Failures**: Inability to detect attacks.
    *   *Fix*: Centralized logging (e.g., Sentry, ELK), alert on suspicious failures.
10. **Server-Side Request Forgery (SSRF)**: Server fetching malicious URLs.
    *   *Fix*: Validate all user-supplied URLs against a whitelist.

---

## 2. Node.js Security Checklist (2024)

### **Core Protections**
*   **Injection**: Use ORMs or parameterized queries. Avoid `exec()`.
*   **Auth**: Use `bcrypt` for passwords. Implement Rate Limiting (`express-rate-limit`).
*   **Headers**: Use `helmet` to set `X-Frame-Options`, `Content-Security-Policy`.
*   **Errors**: **NEVER** return stack traces in production.
*   **Secrets**: Store in `.env`, never commit to Git.

### **Production Best Practices**
*   **Run as non-root**: Don't run Node as root user.
*   **Memory Limit**: Use `--max-old-space-size` to prevent DoS via memory exhaustion.
*   **Cookie Flags**: Set `HttpOnly`, `Secure`, and `SameSite: Strict`.

---

## 3. Express.js Security Cheat Sheet

*   **Dependencies**: `npm audit` before every deploy.
*   **HTTPS**: Force HTTPS (use `hsts` via `helmet`).
*   **Input**: Validate **ALL** input. Use `express-validator` or `zod`.
*   **CSRF**: Use `csurf` or similar middleware if using cookies for auth.
*   **Json Body**: Limit payload size `app.use(express.json({ limit: '10kb' }))` to prevent DoS.
*   **Fingerprinting**: `app.disable('x-powered-by')`.

---

## 4. Tools for Offline Manual Testing

1.  **OWASP ZAP (Zed Attack Proxy)**
    *   *Action*: Download the installer when you have internet. It runs offline to scan localhost.
2.  **Postman / Insomnia**
    *   *Action*: Use to manually fuzz API endpoints (send invalid JSON, SQL strings).
3.  **CodeQL / ESLint Security**
    *   *Action*: `npm install eslint-plugin-security` for offline static analysis.
