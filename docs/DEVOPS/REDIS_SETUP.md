# Production Redis Setup Guide (Ubuntu/Debian)

This guide covers installing Redis on a production VPS and ensuring it starts automatically on boot.

## 1. Installation

Update your package list and install Redis:
```bash
sudo apt update
sudo apt install redis-server -y
```

## 2. Configure for Production (Systemd)

By default, Redis on Ubuntu is set up to use `systemd`. We need to verify the configuration.

1.  Open the Redis configuration file:
    ```bash
    sudo nano /etc/redis/redis.conf
    ```

2.  **Crucial Changes**: Find and modify these lines:

    *   **Supervised**: Ensure it interacts with systemd.
        ```conf
        supervised systemd
        ```

    *   **Bind**: For security, bind ONLY to localhost if the backend is on the same server.
        ```conf
        bind 127.0.0.1 ::1
        ```
        *(If your backend is on a DIFFERENT server, set this to your private IP, e.g., `bind 10.0.0.5`, and configure UFW firewall).*

    *   **Password Protection** (Highly Recommended):
        Find `requirepass` and uncomment it:
        ```conf
        requirepass YOUR_STRONG_PASSWORD
        ```

3.  Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

## 3. Enable Auto-Start

Enable the Redis service so it starts on system boot:

```bash
sudo systemctl enable redis-server
```

## 4. Restart & Verify

1.  Restart Redis to apply changes:
    ```bash
    sudo systemctl restart redis-server
    ```

2.  Check status (should say "active (running)"):
    ```bash
    sudo systemctl status redis-server
    ```

3.  Test connection:
    ```bash
    redis-cli
    # If you set a password:
    # auth YOUR_STRONG_PASSWORD
    ping
    # Response should be: PONG
    ```

## 5. Update Backend Configuration

On your VPS, update your `.env` file (or environment variables) to point to this Redis instance:

```bash
# If running on the same server (localhost)
REDIS_URL=redis://:YOUR_STRONG_PASSWORD@127.0.0.1:6379

# If running on a different server (private IP)
# REDIS_URL=redis://:YOUR_STRONG_PASSWORD@PRIVATE_IP:6379
```

> **Note**: If `REDIS_URL` matches the format `redis://:password@host:port`, the backend will automatically parse the password.

## 6. Troubleshooting

If Redis fails to start:
- Check logs: `sudo journalctl -u redis-server`
- Verify config syntax: `redis-server --test-memory 2` (basic check) or just run properly.
