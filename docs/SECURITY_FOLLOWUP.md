# Security Follow-Up — Manual Steps Required

> Generated: 2026-07-07 | Context: Phase 1 of `MATRIX_DELIVERY_REFACTOR_PROMPT.md`

## 1. Rotate Firebase Admin SDK Key

A live Firebase Admin SDK private key was committed to git history in these files:

- `backend/service-account.json`
- `push-notifications/matrix-delivery-firebase-adminsdk-fbsvc-238f1b1e37.json`

These files have been removed from git tracking (`git rm --cached`) and added to `.gitignore`. However, the key material **still exists in git history** and anyone with repo access can extract it.

**Action required:** Go to the [Firebase Console](https://console.firebase.google.com/) → Project Settings → Service Accounts → Firestore Admin SDK → Generate new private key. This invalidates the old key. Deploy the new key file to the VPS outside the repo directory and update `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_JSON` accordingly.

A rotated key is already present at the repo root (`matrix-delivery-firebase-adminsdk-fbsvc-942e43402a.json`). It has been added to `.gitignore` but **if it was already placed in the repo directory, move it outside the repo** and point `GOOGLE_APPLICATION_CREDENTIALS` to the new path.

## 2. Git History Scrubbing (Optional but Recommended)

The old keys are in git history. To fully remove them:

```bash
# Install BFG Repo-Cleaner (Java required)
# OR use git filter-repo:
pip install git-filter-repo
git filter-repo --path backend/service-account.json --path push-notifications/matrix-delivery-firebase-adminsdk-fbsvc-238f1b1e37.json --invert-paths

# This rewrites history. Requires force-push:
git push origin --force --all
```

**⚠️ Coordinate with all collaborators** before force-pushing. Everyone must clone fresh afterward.

## 3. Verify No Other Secrets Are Committed

Run periodically:
```bash
git ls-files | grep -iE 'secret|key|password|token|credential|firebase|service-account'
grep -rn "BEGIN PRIVATE KEY" .git/ # Check reflog for private keys
```

## 4. Pre-commit Hook Status

A filename-pattern check has been added to `.husky/pre-commit` that blocks staging of files matching `*firebase-adminsdk*.json`, `service-account*.json`, or `.env.production`. This only protects against future commits, not past ones.
