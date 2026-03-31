/**
 * @module ExampleComponent
 * @description Full demo component for V2 Redis-based failover system
 */

import React, { useState, useEffect } from "react";
import { useServerRegistry } from "./useServerRegistry.js";
import { selectServer } from "./serverSelector.js";
import { fetchWithFailover } from "./fetchWithFailover.js";
import { isCircuitOpen, getFailedServers } from "./circuitBreaker.js";

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
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
    padding: "10px",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
  },
  statusBadge: {
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
  },
  live: { backgroundColor: "#dfd", color: "#080" },
  reconnecting: { backgroundColor: "#ffeba7", color: "#880" },
  connecting: { backgroundColor: "#e5e5e5", color: "#666" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "20px",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "2px solid #ddd",
    fontSize: "14px",
    color: "#666",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #eee",
    fontSize: "14px",
  },
  button: {
    padding: "12px 24px",
    fontSize: "16px",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    marginRight: "10px",
    marginBottom: "10px",
  },
  response: {
    padding: "15px",
    backgroundColor: "#f0f0f0",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "14px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    marginTop: "10px",
  },
  circuitPanel: {
    marginTop: "20px",
    padding: "15px",
    backgroundColor: "#fff5f5",
    borderRadius: "4px",
    border: "1px solid #fcc",
  },
  circuitItem: {
    padding: "8px 0",
    borderBottom: "1px solid #eee",
  },
};

export default function ExampleComponent() {
  const { servers, updatedAt, connected } = useServerRegistry();
  const [getResponse, setGetResponse] = useState(null);
  const [getError, setGetError] = useState(null);
  const [getLoading, setGetLoading] = useState(false);
  const [postResponse, setPostResponse] = useState(null);
  const [postError, setPostError] = useState(null);
  const [postLoading, setPostLoading] = useState(false);
  const [failedServers, setFailedServers] = useState({});

  useEffect(() => {
    setFailedServers(getFailedServers());
  }, [getResponse, postResponse]);

  const handleGetRequest = async () => {
    setGetError(null);
    setGetResponse(null);
    setGetLoading(true);

    try {
      const res = await fetchWithFailover(
        "/api/example",
        { method: "GET", idempotencyKey: crypto.randomUUID() },
        servers,
      );
      const data = await res.json();
      setGetResponse(data);
    } catch (err) {
      setGetError(err.message);
    } finally {
      setGetLoading(false);
    }
  };

  const handlePostRequest = async () => {
    setPostError(null);
    setPostResponse(null);
    setPostLoading(true);

    try {
      const res = await fetchWithFailover(
        "/api/order",
        {
          method: "POST",
          body: JSON.stringify({ item: "test" }),
          idempotencyKey: crypto.randomUUID(),
        },
        servers,
      );
      const data = await res.json();
      setPostResponse(data);
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPostLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (connected) {
      return (
        <span style={{ ...styles.statusBadge, ...styles.live }}>Live</span>
      );
    } else if (servers.length > 0) {
      return (
        <span style={{ ...styles.statusBadge, ...styles.reconnecting }}>
          Reconnecting (cached)
        </span>
      );
    }
    return (
      <span style={{ ...styles.statusBadge, ...styles.connecting }}>
        Connecting...
      </span>
    );
  };

  const getTableContent = () => {
    if (!connected && servers.length === 0) {
      return (
        <tr>
          <td
            colSpan="5"
            style={{ ...styles.td, textAlign: "center", color: "#666" }}
          >
            Connecting to aggregator...
          </td>
        </tr>
      );
    }
    if (servers.length === 0 && connected) {
      return (
        <tr>
          <td
            colSpan="5"
            style={{ ...styles.td, textAlign: "center", color: "#666" }}
          >
            No healthy servers
          </td>
        </tr>
      );
    }
    return servers.map((server, idx) => {
      const weight = (1 / (server.score + 0.01)).toFixed(2);
      const circuitOpen = isCircuitOpen(server.url);
      return (
        <tr key={idx}>
          <td style={styles.td}>{server.url}</td>
          <td style={styles.td}>{server.score?.toFixed(4) || "N/A"}</td>
          <td style={styles.td}>{server.priority || 1}</td>
          <td style={styles.td}>{weight}</td>
          <td style={styles.td}>
            <span style={circuitOpen ? { color: "#c00" } : { color: "#080" }}>
              {circuitOpen ? "open" : "closed"}
            </span>
          </td>
        </tr>
      );
    });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>V2 Failover Demo (Redis + WebSocket)</h2>

      <div style={styles.statusBar}>
        <span>Status:</span>
        {getStatusBadge()}
        {updatedAt && (
          <span style={{ fontSize: "12px", color: "#666" }}>
            Last update: {new Date(updatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>URL</th>
            <th style={styles.th}>Score</th>
            <th style={styles.th}>Priority</th>
            <th style={styles.th}>Weight</th>
            <th style={styles.th}>Circuit</th>
          </tr>
        </thead>
        <tbody>{getTableContent()}</tbody>
      </table>

      <button
        style={styles.button}
        onClick={handleGetRequest}
        disabled={getLoading}
      >
        {getLoading ? "Loading..." : "GET /api/example"}
      </button>

      <button
        style={styles.button}
        onClick={handlePostRequest}
        disabled={postLoading}
      >
        {postLoading ? "Loading..." : "POST /api/order"}
      </button>

      {getError && (
        <div style={{ ...styles.response, color: "#c00" }}>
          GET Error: {getError}
        </div>
      )}
      {getResponse && (
        <div style={styles.response}>
          GET Response: {JSON.stringify(getResponse, null, 2)}
        </div>
      )}

      {postError && (
        <div style={{ ...styles.response, color: "#c00" }}>
          POST Error: {postError}
        </div>
      )}
      {postResponse && (
        <div style={styles.response}>
          POST Response: {JSON.stringify(postResponse, null, 2)}
        </div>
      )}

      {Object.keys(failedServers).length > 0 && (
        <div style={styles.circuitPanel}>
          <h4>Circuit Breaker Status</h4>
          {Object.entries(failedServers).map(([url, timestamp]) => {
            const expires = new Date(timestamp + 60000).toLocaleTimeString();
            return (
              <div key={url} style={styles.circuitItem}>
                <strong>{url}</strong> - Opens at {expires}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
