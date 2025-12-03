# Mobile Testing Guide (LAN Access)

This guide explains how to test the Matrix Delivery application on your mobile device using your local network.

## Quick Start

1. **Connect to WiFi**: Ensure your computer and mobile device are connected to the **same WiFi network**.
2. **Start the Server**:
   Open a terminal in the project root and run:
   ```bash
   node start-lan.js
   ```
3. **Access on Mobile**:
   The script will display a URL (e.g., `http://192.168.1.X:3000`).
   Open this URL in your mobile browser (Chrome/Safari).

## Troubleshooting

### 1. "Site can't be reached" or Connection Timeout
This is usually caused by the Windows Firewall blocking the connection.

**Solution:**
1. Press `Win + R`, type `wf.msc`, and press Enter.
2. Click on **Inbound Rules**.
3. Look for `Node.js JavaScript Runtime` rules.
4. Ensure they are **Enabled** (green checkmark).
5. Double-click the rule, go to the **Advanced** tab, and ensure **Private** profile is checked.

### 2. API Errors on Mobile
If the app loads but you can't login or see data:
- Check the console output on your computer for backend errors.
- Ensure the backend health check passed during startup.
- Verify that `REACT_APP_API_URL` in `frontend/.env` matches your computer's IP address (the script does this automatically).

### 3. Wrong IP Address
If the script detects the wrong IP (e.g., a virtual adapter IP):
- You can manually edit `frontend/.env.lan` and set your IP.
- Then run `npm start` in the `frontend` directory manually.

## Notes
- The development server uses `http`, not `https`. Some browser features (like Geolocation) might require `https` or a specific browser configuration to work on non-localhost origins.
- On Android (Chrome), you can treat `http://192.168.x.x` as a secure origin by going to `chrome://flags/#unsafely-treat-insecure-origin-as-secure` and adding your IP.
