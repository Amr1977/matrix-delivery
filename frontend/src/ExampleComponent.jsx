/**
 * @fileoverview Example component demonstrating failover integration.
 * @module ExampleComponent
 */

import React, { useState } from "react";
import { useServerRegistry } from "./useServerRegistry.js";
import { rankServers, computeLoadScore } from "./serverSelector.js";
import { fetchWithFailover } from "./fetchWithFailover.js";

const styles = {
  container: {
    padding: "20px",
    fontFamily: "system-ui, sans-serif",
    maxWidth: "800px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "20px",
    paddingBottom: "10px",
    borderBottom: "1px solid #eee",
  },
  loading: {
    padding: "20px",
    textAlign: "center",
    color: "#666",
  },
  error: {
    padding: "15px",
    backgroundColor: "#fee",
    border: "1px solid #fcc",
    borderRadius: "4px",
    color: "#c00",
    marginBottom: "20px",
  },
  serverList: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 20px 0",
  },
  serverItem: {
    display: "flex",
    alignItems: "center",
    padding: "12px",
    marginBottom: "8px",
    backgroundColor: "#f9f9f9",
    borderRadius: "4px",
    gap: "12px",
  },
  serverUrl: {
    flex: 1,
    fontWeight: "500",
  },
  loadScore: {
    minWidth: "60px",
    textAlign: "right",
    fontSize: "14px",
    color: "#666",
  },
  priority: {
    minWidth: "40px",
    textAlign: "center",
    fontSize: "12px",
    color: "#999",
  },
  statusBadge: {
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
  },
  healthy: {
    backgroundColor: "#dfd",
    color: "#080",
  },
  unhealthy: {
    backgroundColor: "#fee",
    color: "#c00",
  },
  button: {
    padding: "12px 24px",
    fontSize: "16px",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    marginBottom: "20px",
  },
  response: {
    padding: "15px",
    backgroundColor: "#f0f0f0",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "14px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};

/**
 * Example component showing failover usage.
 * @returns {React.ReactElement}
 */
export default function ExampleComponent() {
  const { servers, loading, error: firestoreError } = useServerRegistry();
  const [response, setResponse] = useState(null);
  const [requestError, setRequestError] = useState(null);

  const rankedServers = rankServers(servers);

  const handleMakeRequest = async () => {
    setRequestError(null);
    setResponse(null);

    try {
      const res = await fetchWithFailover(
        "/api/example",
        {
          method: "GET",
          idempotencyKey: crypto.randomUUID(),
        },
        servers,
      );

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setRequestError(err.message);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading server registry...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Server Registry (Failover Demo)</h2>

      {firestoreError && (
        <div style={styles.error}>
          Firestore Error: {firestoreError.message}
        </div>
      )}

      <ul style={styles.serverList}>
        {rankedServers.map((server) => (
          <li key={server.id} style={styles.serverItem}>
            <span style={styles.serverUrl}>{server.url}</span>
            <span style={styles.loadScore}>
              {computeLoadScore(server).toFixed(2)}
            </span>
            <span style={styles.priority}>P{server.priority}</span>
            <span
              style={{
                ...styles.statusBadge,
                ...(server.status === "healthy"
                  ? styles.healthy
                  : styles.unhealthy),
              }}
            >
              {server.status}
            </span>
          </li>
        ))}
      </ul>

      {rankedServers.length === 0 && (
        <p style={{ color: "#666", marginBottom: "20px" }}>
          No healthy servers available
        </p>
      )}

      <button
        style={styles.button}
        onClick={handleMakeRequest}
        disabled={loading || rankedServers.length === 0}
      >
        Make Request
      </button>

      {requestError && (
        <div style={styles.error}>Request Error: {requestError}</div>
      )}

      {response && (
        <div style={styles.response}>{JSON.stringify(response, null, 2)}</div>
      )}
    </div>
  );
}
