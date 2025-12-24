# 🔍 Auto-Logout Debugging Guide

## Quick Checks

### 1. Check Cookies After Login
1. Login successfully
2. Press F12 → Application tab → Cookies → `http://localhost:5000`
3. **Do you see any cookies?**

### 2. Check Console Logs
After login, look for:
- ✅ "Token set, user logged in"
- ❌ "Session expired, logging out" (bad)
- ❌ "No active session" (bad)

### 3. Check Network Tab
1. Login
2. F12 → Network tab
3. Find `/auth/login` request
4. Check Response Headers for `Set-Cookie`

---

## Most Likely Causes

### Cause 1: Backend Not Setting Cookies
**Check:** `backend/routes/auth.js` login endpoint

**Should have:**
```javascript
res.cookie('token', token, {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000
});
```

### Cause 2: CORS Not Allowing Credentials
**Check:** `backend/server.js`

**Should have:**
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true  // ← MUST be true
}));
```

### Cause 3: Frontend Not Sending Credentials
**Already fixed** - all fetch calls have `credentials: 'include'`

---

## Quick Fix to Test

**Add debug logging to see what's happening:**

In `App.js`, find the `logout` function and add:
```javascript
const logout = () => {
  console.log('🚪 LOGOUT CALLED - Stack trace:', new Error().stack);
  setToken(null);
  setCurrentUser(null);
  // ... rest
};
```

This will show you **when** and **why** logout is being called.

---

## What to Share

If still not working, share:
1. Console logs after login
2. Screenshot of cookies in DevTools
3. Network tab screenshot of `/auth/login` response

---

**Most common fix:** Backend needs to set cookies with `credentials: true` in CORS.
