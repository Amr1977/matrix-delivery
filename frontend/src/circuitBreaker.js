/**
 * @fileoverview Circuit breaker implementation with in-memory and localStorage persistence.
 * Provides two-layer storage for circuit breaker state that survives page refresh.
 * @module circuitBreaker
 */

const COOLDOWN_MS = 60000;
const STORAGE_KEY = "mdp_circuit_breaker";

const inMemoryBreakers = new Map();

/**
 * Safely parses JSON from localStorage, returning empty object on error.
 * @returns {Object} Parsed localStorage data or empty object
 */
function getStorageData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Safely writes JSON to localStorage, silently failing on error.
 * @param {Object} data - Data to serialize and store
 */
function setStorageData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Silently fail on private browsing or quota errors
  }
}

/**
 * Prunes expired entries from both in-memory and localStorage.
 * @private
 */
function pruneExpired() {
  const now = Date.now();
  const storageData = getStorageData();
  let hasChanges = false;

  // Prune in-memory
  for (const [url, timestamp] of inMemoryBreakers.entries()) {
    if (now - timestamp > COOLDOWN_MS) {
      inMemoryBreakers.delete(url);
    }
  }

  // Prune localStorage
  for (const url of Object.keys(storageData)) {
    if (now - storageData[url] > COOLDOWN_MS) {
      delete storageData[url];
      hasChanges = true;
    }
  }

  if (hasChanges) {
    setStorageData(storageData);
  }
}

/**
 * Checks if the circuit is open for a given server.
 * Returns true if the server is currently in cooldown period.
 * Checks in-memory first, then localStorage.
 * @param {string} serverUrl - The server URL to check
 * @returns {boolean} True if circuit is open (in cooldown)
 */
export function isCircuitOpen(serverUrl) {
  pruneExpired();

  // Check in-memory first
  if (inMemoryBreakers.has(serverUrl)) {
    const timestamp = inMemoryBreakers.get(serverUrl);
    if (Date.now() - timestamp <= COOLDOWN_MS) {
      return true;
    }
    inMemoryBreakers.delete(serverUrl);
  }

  // Check localStorage
  const storageData = getStorageData();
  if (storageData[serverUrl]) {
    const timestamp = storageData[serverUrl];
    if (Date.now() - timestamp <= COOLDOWN_MS) {
      // Hydrate memory
      inMemoryBreakers.set(serverUrl, timestamp);
      return true;
    }
    // Expired - clean up
    delete storageData[serverUrl];
    setStorageData(storageData);
  }

  return false;
}

/**
 * Records a failure timestamp for a server in both storage layers.
 * @param {string} serverUrl - The server URL that failed
 */
export function markServerFailed(serverUrl) {
  const timestamp = Date.now();

  // Update in-memory
  inMemoryBreakers.set(serverUrl, timestamp);

  // Update localStorage
  const storageData = getStorageData();
  storageData[serverUrl] = timestamp;
  setStorageData(storageData);
}

/**
 * Removes a server from both storage layers.
 * Used when a server succeeds after a circuit was open.
 * @param {string} serverUrl - The server URL to reset
 */
export function resetServer(serverUrl) {
  // Remove from in-memory
  inMemoryBreakers.delete(serverUrl);

  // Remove from localStorage
  const storageData = getStorageData();
  delete storageData[serverUrl];
  setStorageData(storageData);
}

/**
 * Returns a snapshot of all currently failed servers.
 * Expires entries are pruned before returning.
 * @returns {Object} Object mapping server URLs to failure timestamps
 */
export function getFailedServers() {
  pruneExpired();

  const result = {};
  for (const [url, timestamp] of inMemoryBreakers.entries()) {
    result[url] = timestamp;
  }
  return result;
}
