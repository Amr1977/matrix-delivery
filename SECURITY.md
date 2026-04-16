# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email: amr.lotfy.othman@gmail.com
3. Include in your report:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Any suggested fixes (optional)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Fix Timeline**: Depending on severity (critical issues prioritized)

### Scope

In-scope vulnerabilities:

- SQL injection
- Authentication/authorization bypass
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Sensitive data exposure
- Remote code execution
- JWT/security token issues
- Payment transaction vulnerabilities

Out of scope:

- Social engineering attacks
- Physical security
- Denial of service (unless severe)
- Issues in third-party dependencies (report to upstream)

### Disclosure Policy

- Public disclosure will be made after the fix is released
- Credit will be given to reporters (unless requested otherwise)

### Security Updates

Security updates will be published as patch releases and announced via GitHub Security Advisories.
