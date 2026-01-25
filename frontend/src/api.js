// API utility
import { getDeviceFingerprint } from './utils/fingerprint';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.fingerprint = null;
    this.csrfToken = null;
    this.isFetchingToken = false;

    // Initialize fingerprint in background
    getDeviceFingerprint().then(fp => {
      this.fingerprint = fp;
    });
  }

  async fetchCsrfToken() {
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    this.tokenPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}/csrf-token`, {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          this.csrfToken = data.csrfToken;
        }
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      } finally {
        this.tokenPromise = null;
      }
    })();

    return this.tokenPromise;
  }

  async request(method, endpoint, data = null, options = {}) {
    // Ensure we have a fingerprint if possible (but don't block too long)
    if (!this.fingerprint) {
      try {
        this.fingerprint = await getDeviceFingerprint();
      } catch (e) {
        // Ignore error, continue without fingerprint
      }
    }

    const startTime = Date.now();
    const url = `${this.baseURL}${endpoint}`;

    console.debug(`API Request: ${method} ${endpoint}`, {
      method,
      endpoint,
      hasData: !!data,
      options
    });

    try {
      const headers = {
        ...options.headers
      };

      if (!(data instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      if (this.fingerprint) {
        headers['x-device-fingerprint'] = this.fingerprint;
      }

      const config = {
        method,
        credentials: 'include', // Include cookies for session-based auth
        headers,
        ...options
      };

      // Add CSRF token for state-changing requests
      const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
      if (!safeMethods.includes(method)) {
        if (!this.csrfToken) {
          await this.fetchCsrfToken();
        }
        if (this.csrfToken) {
          config.headers['X-CSRF-Token'] = this.csrfToken;
        }
      }

      // Add body for non-GET requests
      if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);
      const duration = Date.now() - startTime;

      // Handle 403 Forbidden (CSRF Token Invalid) - Retry logic
      if (response.status === 403 && !options._retry) {
        // Check if it's likely a CSRF issue (or just a generic auth issue)
        // We'll try to refresh the token and retry once
        console.warn(`403 Forbidden encountered at ${endpoint}. Refreshing CSRF token and retrying...`);
        this.csrfToken = null; // Clear invalid token
        await this.fetchCsrfToken(); // Fetch new token

        // Recursive retry with _retry flag
        return this.request(method, endpoint, data, { ...options, _retry: true });
      }

      // Log API response
      console.log(`API ${method} ${endpoint} - ${response.status} (${duration}ms)`);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`API Error: ${method} ${endpoint}`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          duration: `${duration}ms`
        });

        // Try to parse error as JSON to get friendly message
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (e) {
          // If not JSON, use the raw text if it's short, otherwise fallback to status
          if (errorText && errorText.length < 200) {
            errorMessage = errorText;
          }
        }

        throw new Error(errorMessage);
      }

      const responseData = await response.json();

      console.debug(`API Success: ${method} ${endpoint}`, {
        duration: `${duration}ms`,
        hasResponseData: !!responseData
      });

      return responseData;
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error(`API Request Failed: ${method} ${endpoint}`, {
        error: error.message,
        duration: `${duration}ms`,
        stack: error.stack
      });

      throw error;
    }
  }

  // HTTP method shortcuts
  async get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  }

  async post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  async put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  async patch(endpoint, data, options = {}) {
    return this.request('PATCH', endpoint, data, options);
  }

  async delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options);
  }

  // Authentication methods
  async forgotPassword(email, recaptchaToken) {
    return this.post('/auth/forgot-password', { email, recaptchaToken });
  }

  async resetPassword(token, newPassword) {
    return this.post('/auth/reset-password', { token, newPassword });
  }

  async sendEmailVerification() {
    return this.post('/auth/send-verification');
  }

  async verifyEmail(token) {
    return this.post('/auth/verify-email', { token });
  }

  // Payment methods
  async createPaymentIntent(orderId, amount, currency = 'usd') {
    return this.post('/payments/create-intent', { orderId, amount, currency });
  }

  async getPaymentDetails(orderId) {
    return this.get(`/payments/order/${orderId}`);
  }

  async processRefund(paymentId, amount, reason) {
    return this.post(`/payments/refund/${paymentId}`, { amount, reason });
  }

  async getPaymentMethods() {
    return this.get('/payments/methods');
  }

  async addPaymentMethod(paymentMethodId) {
    return this.post('/payments/methods', { paymentMethodId });
  }

  async deletePaymentMethod(methodId) {
    return this.delete(`/payments/methods/${methodId}`);
  }

  // Messaging methods
  async sendMessage(orderId, recipientId, content, messageType = 'text') {
    return this.post('/messages', { orderId, recipientId, content, messageType });
  }

  async getOrderMessages(orderId, page = 1, limit = 50) {
    return this.get(`/messages/order/${orderId}?page=${page}&limit=${limit}`);
  }

  async getConversations(page = 1, limit = 20) {
    return this.get(`/messages/conversations?page=${page}&limit=${limit}`);
  }

  async markMessagesRead(orderId) {
    return this.post(`/messages/order/${orderId}/read`);
  }

  async getUnreadMessageCount() {
    return this.get('/messages/unread-count');
  }

  async deleteMessage(messageId) {
    return this.delete(`/messages/${messageId}`);
  }

  async reportMessage(messageId, reason) {
    return this.post(`/messages/${messageId}/report`, { reason });
  }

  // Media upload methods
  async uploadImage(orderId, file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderId', orderId);

    return this.uploadFile('/uploads/image', formData, onProgress);
  }

  async uploadVideo(orderId, file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderId', orderId);

    return this.uploadFile('/uploads/video', formData, onProgress);
  }

  async uploadVoice(orderId, blob, onProgress) {
    const formData = new FormData();
    formData.append('file', blob, 'voice-recording.webm');
    formData.append('orderId', orderId);

    return this.uploadFile('/uploads/voice', formData, onProgress);
  }

  async uploadFile(endpoint, formData, onProgress) {
    const url = `${this.baseURL}${endpoint}`;

    // Ensure we have fingerprint and CSRF token
    if (!this.fingerprint) {
      try {
        this.fingerprint = await getDeviceFingerprint();
      } catch (e) {
        // Ignore
      }
    }

    if (!this.csrfToken) {
      await this.fetchCsrfToken();
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error || `Upload failed with status ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', url);

      // CRITICAL: Set withCredentials for session cookies
      xhr.withCredentials = true;

      // Add security headers
      if (this.csrfToken) {
        xhr.setRequestHeader('X-CSRF-Token', this.csrfToken);
      }
      if (this.fingerprint) {
        xhr.setRequestHeader('x-device-fingerprint', this.fingerprint);
      }

      xhr.send(formData);
    });
  }

  async sendMediaMessage(orderId, recipientId, mediaData, caption = '') {
    return this.post('/messages', {
      orderId,
      recipientId,
      content: caption,
      messageType: mediaData.mediaType,
      mediaData
    });
  }
}

// Create singleton instance
const api = new ApiClient();

export default api;
