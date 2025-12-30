// API utility with logging
import logger from './logger';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(method, endpoint, data = null, options = {}) {
    const startTime = Date.now();
    const url = `${this.baseURL}${endpoint}`;

    logger.debug(`API Request: ${method} ${endpoint}`, {
      method,
      endpoint,
      hasData: !!data,
      options
    });

    try {
      const config = {
        method,
        credentials: 'include', // Include cookies for session-based auth
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };



      // Add body for non-GET requests
      if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);
      const duration = Date.now() - startTime;

      // Log API response
      logger.api(method, endpoint, response.status, duration, {
        responseSize: response.headers.get('content-length') || 'unknown'
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`API Error: ${method} ${endpoint}`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          duration: `${duration}ms`
        });

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      logger.debug(`API Success: ${method} ${endpoint}`, {
        duration: `${duration}ms`,
        hasResponseData: !!responseData
      });

      return responseData;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`API Request Failed: ${method} ${endpoint}`, {
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
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', url);

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
