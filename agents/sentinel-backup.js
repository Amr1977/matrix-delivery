#!/usr/bin/env node

/**
 * SENTINEL - Simple Backup Agent
 * 
 * Runs on GCP machine
 * Monitors platform health
 * Takes lead when Osama is at rest
 * Simple. Honest. Reliable.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SENTINEL_BOT_TOKEN = '***REDACTED***';
const FATHER_CHAT = 7615344890;
const GROUP_CHAT = -1005179780577;
const API_URL = 'https://matrix-delivery-api.mywire.org/api';
const CHECK_INTERVAL = 300000; // 5 minutes

let lastStatus = {
  healthy: true,
  lastCheck: new Date(),
  checkCount: 0,
  issueCount: 0
};

class Sentinel {
  constructor() {
    this.name = 'SENTINEL';
    this.startTime = new Date();
  }

  log(msg, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      'ok': '✅',
      'warn': '⚠️',
      'error': '❌',
      'info': 'ℹ️'
    }[type] || 'ℹ️';

    console.log(`${emoji} [${timestamp}] ${msg}`);
  }

  async notify(msg, target = 'group') {
    const chatId = target === 'father' ? FATHER_CHAT : GROUP_CHAT;
    const postData = JSON.stringify({
      chat_id: chatId,
      text: `🛡️ **[SENTINEL]** ${msg}`,
      parse_mode: 'Markdown'
    });

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.telegram.org',
        path: `/bot${SENTINEL_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      const req = https.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve());
      });

      req.on('error', () => resolve());
      req.write(postData);
      req.end();
    });
  }

  async checkHealth() {
    return new Promise((resolve) => {
      https.get(`${API_URL}/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              status: json.status,
              database: json.database,
              uptime: json.uptime,
              users: json.users,
              orders: json.orders
            });
          } catch (e) {
            resolve({ status: 'error', error: e.message });
          }
        });
      }).on('error', (err) => {
        resolve({ status: 'error', error: err.message });
      });
    });
  }

  async monitor() {
    this.log('Starting health check...', 'info');
    
    const health = await this.checkHealth();
    lastStatus.checkCount++;
    lastStatus.lastCheck = new Date();

    if (health.status === 'healthy') {
      // All good
      lastStatus.healthy = true;
      this.log(`Platform healthy - ${health.users} users, ${health.orders} orders, uptime: ${Math.round(health.uptime)}s`, 'ok');
      
      // Every 3rd check, post status to group
      if (lastStatus.checkCount % 3 === 0) {
        await this.notify(`✅ Platform healthy\n📊 Users: ${health.users} | Orders: ${health.orders}\n⏱️ Uptime: ${Math.round(health.uptime)}s`, 'group');
      }
    } else {
      // Problem detected
      lastStatus.healthy = false;
      lastStatus.issueCount++;
      
      this.log(`⚠️ Platform issue detected: ${health.status}`, 'error');
      
      // Alert Father immediately
      await this.notify(`🚨 **ALERT:** Platform health check failed\n\nStatus: ${health.status}\nError: ${health.error || 'Unknown'}\n\nOsama should investigate or take manual action.`, 'father');
      
      // Also notify group
      await this.notify(`⚠️ Issue detected: ${health.status}`, 'group');
    }
  }

  async start() {
    this.log('SENTINEL starting on GCP', 'info');
    await this.notify('🛡️ SENTINEL activated - monitoring platform health');

    // First check
    await this.monitor();

    // Schedule checks every 5 minutes
    setInterval(() => {
      this.monitor().catch(err => this.log(`Monitor error: ${err.message}`, 'error'));
    }, CHECK_INTERVAL);

    this.log('SENTINEL monitoring active (check every 5 minutes)', 'info');
  }
}

// Start
const sentinel = new Sentinel();
sentinel.start().catch(err => {
  console.error('SENTINEL ERROR:', err);
  process.exit(1);
});

// Keep alive
process.on('SIGTERM', () => {
  console.log('SENTINEL shutting down gracefully');
  process.exit(0);
});
