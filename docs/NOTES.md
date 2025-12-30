# ARCHITECTURE

# CACHE
- Use cacheMapTile for FE tiles caching!!



# Security

# Web Vulnerabilities

- IDOR 
- XSS
-

# Fraude detection

- **FingerprintJS** - Identifies browser and hybrid mobile application users even when they purge data storage. Allows you to detect account takeovers, account sharing and repeated malicious activity.


#Bugs

- Maps: if calculation is straight line: show distance!! ⚠️
- Flooding requests:⚠️ `/api/stats/footer`  !!
- Remove  `/api/stats/footer` for non authenticated session! ⚠️
- If has no token dont send `/me` or any other requests that require token !! (Why 500!!) ⚠️
- Excessive FE re-rendering: check hooks ⚠️
- Language Switch: should keep each language text in its native text ⚠️
- Use HTTPS in server ⚠️
- After login: where do you save token ?? token lifecycle ??! ⚠️
- DISASTER !! you mixed users reviews with order reviews ⚠️