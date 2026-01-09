const API_URL = process.env.REACT_APP_API_URL;

// In-memory CSRF token (never persisted to localStorage)
let csrfToken = null;

const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

const fetchCsrfToken = async () => {
  // If CSRF is disabled on the backend, this may return { csrfToken: null }
  const url = `${API_URL}/api/csrf-token`;

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  // If the endpoint is missing or disabled, fail loudly in development
  if (!response.ok) {
    console.error('Failed to fetch CSRF token', response.status);
    throw new Error('Failed to fetch CSRF token');
  }

  const data = await response.json();
  csrfToken = data.csrfToken || null;
  return csrfToken;
};

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    method,
    headers,
    // CRITICAL: always send cookies for httpOnly cookie-based auth
    credentials: 'include',
  };

  // Attach CSRF token for state-changing requests when enabled
  if (!safeMethods.includes(method)) {
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
};

export const authRequest = async (endpoint, data) => {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getRequest = async (endpoint) => {
  return apiRequest(endpoint, {
    method: 'GET',
  });
};

export const postRequest = async (endpoint, data) => {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const putRequest = async (endpoint, data) => {
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteRequest = async (endpoint) => {
  return apiRequest(endpoint, {
    method: 'DELETE',
  });
};
