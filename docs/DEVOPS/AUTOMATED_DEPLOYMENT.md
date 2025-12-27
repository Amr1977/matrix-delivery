# Automated Deployment Setup

## Overview
This guide explains how to set up automated deployment for the Matrix Delivery backend when pushing to the `master` branch on GitHub.

## Prerequisites
- VPS with SSH access (root@vps283058.vps.ovh.ca)
- GitHub repository (Amr1977/matrix-delivery)
- PM2 installed and configured on the server

## Setup Steps

### 1. Install Webhook Handler on Server

SSH to your server and install the webhook handler:

```bash
ssh root@vps283058.vps.ovh.ca

# Install webhook package
npm install -g webhook

# Create webhook directory
mkdir -p /opt/webhooks
cd /opt/webhooks
```

### 2. Copy Deployment Script

Copy the deployment script to the server:

```bash
# From your local machine
scp d:\matrix-delivery\scripts\deploy-webhook.sh root@vps283058.vps.ovh.ca:/opt/webhooks/

# On the server, make it executable
ssh root@vps283058.vps.ovh.ca
chmod +x /opt/webhooks/deploy-webhook.sh
```

### 3. Create Webhook Configuration

Create `/opt/webhooks/hooks.json`:

```json
[
  {
    "id": "matrix-delivery-deploy",
    "execute-command": "/opt/webhooks/deploy-webhook.sh",
    "command-working-directory": "/root/matrix-delivery",
    "response-message": "Deployment triggered",
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hash-sha256",
            "secret": "YOUR_WEBHOOK_SECRET_HERE",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature-256"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/master",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  }
]
```

**Important**: Replace `YOUR_WEBHOOK_SECRET_HERE` with a strong secret (generate one with `openssl rand -hex 32`)

### 4. Start Webhook Service

```bash
# Start webhook listener on port 9000
webhook -hooks /opt/webhooks/hooks.json -verbose -port 9000

# Or run as a service with PM2
pm2 start webhook --name github-webhook -- -hooks /opt/webhooks/hooks.json -verbose -port 9000
pm2 save
```

### 5. Configure Apache Reverse Proxy

Add to your Apache configuration (`/etc/apache2/sites-available/matrix-delivery.conf`):

```apache
# GitHub Webhook endpoint
ProxyPass /webhook http://localhost:9000/hooks/matrix-delivery-deploy
ProxyPassReverse /webhook http://localhost:9000/hooks/matrix-delivery-deploy
```

Reload Apache:
```bash
systemctl reload apache2
```

### 6. Configure GitHub Webhook

1. Go to your GitHub repository: https://github.com/Amr1977/matrix-delivery
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: `https://matrix-api.oldantique50.com/webhook`
   - **Content type**: `application/json`
   - **Secret**: (use the same secret from hooks.json)
   - **Which events**: Select "Just the push event"
   - **Active**: ✅ Checked
4. Click **Add webhook**

### 7. Test the Webhook

Make a small change and push to master:

```bash
git commit --allow-empty -m "Test automated deployment"
git push origin master
```

Check the deployment logs:
```bash
tail -f /var/log/matrix-deploy.log
```

## Troubleshooting

### Webhook not triggering
- Check GitHub webhook delivery history for errors
- Verify webhook secret matches in both places
- Check Apache logs: `tail -f /var/log/apache2/error.log`
- Check webhook service: `pm2 logs github-webhook`

### Deployment script fails
- Check deployment logs: `tail -f /var/log/matrix-deploy.log`
- Verify PM2 is running: `pm2 status`
- Check file permissions: `ls -la /opt/webhooks/`

### Backend not restarting
- Check PM2 logs: `pm2 logs matrix-delivery-backend`
- Manually restart: `pm2 restart matrix-delivery-backend`
- Check for syntax errors: `node backend/server.js`

## Security Notes

- Keep your webhook secret secure and never commit it to the repository
- The deployment script runs as root - ensure it's properly secured
- Consider adding IP whitelisting for GitHub webhook IPs
- Regularly rotate the webhook secret

## Alternative: Simple Cron-based Deployment

If webhooks are too complex, you can use a simple cron job:

```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * cd /root/matrix-delivery && git pull origin master && cd backend && npm install --production && pm2 restart matrix-delivery-backend >> /var/log/matrix-deploy.log 2>&1
```

This is less efficient but simpler to set up.
