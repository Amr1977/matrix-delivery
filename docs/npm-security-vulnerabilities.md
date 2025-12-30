# NPM Security Vulnerabilities

**Date Identified**: 2025-12-30  
**Status**: Partially Addressed  
**Priority**: Medium

## Summary

During production build, npm audit detected **19 vulnerabilities** (13 moderate, 6 high) in the frontend dependencies. These primarily stem from outdated dependencies in the Create React App (`react-scripts`) toolchain and Firebase packages.

## Vulnerabilities Breakdown

### High Severity (6)

#### 1. nth-check <2.0.1
- **CVE**: [GHSA-rp65-9cf3-cjxr](https://github.com/advisories/GHSA-rp65-9cf3-cjxr)
- **Issue**: Inefficient Regular Expression Complexity
- **Impact**: Potential DoS through regex complexity attacks
- **Dependency Chain**: `nth-check` → `css-select` → `svgo` → `@svgr/plugin-svgo` → `@svgr/webpack` → `react-scripts`
- **Fix Available**: ❌ Requires `npm audit fix --force` (breaking change to react-scripts@0.0.0)
- **Actual Risk**: **Low** - Only affects build tools, not runtime code

### Moderate Severity (13)

#### 2. postcss <8.4.31
- **CVE**: [GHSA-7fh5-64p2-3v2j](https://github.com/advisories/GHSA-7fh5-64p2-3v2j)
- **Issue**: PostCSS line return parsing error
- **Dependency Chain**: `postcss` → `resolve-url-loader` → `react-scripts`
- **Fix Available**: ❌ Requires `npm audit fix --force` (breaking change)
- **Actual Risk**: **Low** - Build-time only

#### 3. undici 6.0.0 - 6.21.1
- **CVE**: 
  - [GHSA-c76h-2ccp-4975](https://github.com/advisories/GHSA-c76h-2ccp-4975) - Insufficiently Random Values
  - [GHSA-cxrh-j4jr-qwg3](https://github.com/advisories/GHSA-cxrh-j4jr-qwg3) - DoS via bad certificate data
- **Impact**: Affects multiple Firebase packages:
  - `@firebase/auth`
  - `@firebase/auth-compat`
  - `@firebase/firestore`
  - `@firebase/firestore-compat`
  - `@firebase/functions`
  - `@firebase/functions-compat`
  - `@firebase/storage`
  - `@firebase/storage-compat`
- **Fix Available**: ✅ `npm audit fix` (non-breaking)
- **Actual Risk**: **Medium** - Affects production runtime, especially authentication

#### 4. webpack-dev-server <=5.2.0
- **CVE**: 
  - [GHSA-9jgg-88mc-972h](https://github.com/advisories/GHSA-9jgg-88mc-972h) - Source code theft (non-Chromium browsers)
  - [GHSA-4v9v-hfq4-rm2v](https://github.com/advisories/GHSA-4v9v-hfq4-rm2v) - Source code theft (general)
- **Impact**: Potential source code exposure when accessing malicious websites during development
- **Fix Available**: ❌ Requires `npm audit fix --force` (breaking change)
- **Actual Risk**: **Low** - Development-only, not included in production builds

## Actions Taken

### 2025-12-30
- ✅ Ran `npm audit fix` to address undici vulnerabilities in Firebase packages

## Recommendations

### Short-term (Current Project)

1. **Monitor Firebase Updates**: Regularly check for Firebase SDK updates that may resolve undici dependencies
   ```bash
   npm outdated firebase
   npm install firebase@latest
   ```

2. **Accept Remaining Risks**: The `react-scripts` vulnerabilities require breaking changes and are low actual risk:
   - Build-time only dependencies
   - Don't affect production runtime
   - Running `npm audit fix --force` would break the project (downgrades to react-scripts@0.0.0)

3. **Development Precautions**: For `webpack-dev-server` vulnerabilities:
   - Avoid visiting untrusted websites while dev server is running
   - Use Chromium-based browsers for development (Chrome, Edge, Brave)

### Long-term (Future Migration)

**Root Cause**: Create React App (CRA) is no longer actively maintained, leading to dependency stagnation.

**Recommended Migration Path**:

1. **Option A: Vite** (Recommended)
   - Modern, fast build tool
   - Minimal migration effort from CRA
   - Active maintenance and community
   - Better dev server performance

2. **Option B: Next.js**
   - More opinionated framework
   - Built-in routing, SSR, API routes
   - Good for full-stack applications
   - May require more refactoring

**Migration Priority**: Medium (schedule after MVP launch)

## Testing Requirements

After any dependency updates:
- [ ] Verify all frontend BDD tests pass
- [ ] Test authentication flows with Firebase
- [ ] Verify production build succeeds
- [ ] Test all Firebase integrations (Auth, Firestore, Storage, Functions)

## Related Documentation

- [Security Guide](./SECURITY.md) - General security practices
- [Frontend Setup](../frontend/README.md) - Frontend dependencies and setup
- [Firebase Configuration](../frontend/src/config/firebase.js) - Firebase SDK setup

## References

- [npm audit documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Create React App status](https://github.com/facebook/create-react-app)
- [Vite migration guide](https://vitejs.dev/guide/migration-from-cra.html)
- [Firebase SDK releases](https://firebase.google.com/support/release-notes/js)
