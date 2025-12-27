# 🗺️ Offline Maps Guide (Caching Proxy)

The system now uses an **Integrated Caching Proxy** architecture. You do **not** need to manually convert files or run a separate server.

## How it Works
1.  **Frontend**: Requests tiles from the main Backend API (`/api/maps/tiles/...`).
2.  **Backend**:
    - Checks `backend/maps/tiles.db` (Local Cache).
    - If found: Serves locally (Offline).
    - If missing: Downloads from OpenStreetMap *once* and saves it.

## 🚀 Setup Steps

1.  **Install Dependencies** (if not already done):
    ```powershell
    cd d:\matrix-delivery\backend
    npm install better-sqlite3 axios
    ```

2.  **Start the Backend**:
    ```powershell
    npm run dev
    ```

3.  **Start the Frontend**:
    ```powershell
    cd d:\matrix-delivery\frontend
    npm start
    ```

## 🔍 Verification
1.  Open the app and navigate to a location (e.g., Cairo).
2.  The backend will download and cache the tiles for that area.
3.  **Test Offline**: Disconnect your internet and verify you can still see the map for that same area.

*No further configuration is required.*
