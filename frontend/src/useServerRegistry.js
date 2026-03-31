/**
 * @fileoverview React hook for real-time server registry updates via Firestore onSnapshot.
 * @module useServerRegistry
 */

import { useState, useEffect } from "react";
import { db } from "./firebase.js";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

/**
 * React hook that provides real-time server registry data from Firestore.
 * Uses onSnapshot for WebSocket-based live updates.
 * @returns {Object} { servers: Array, loading: boolean, error: Error|null }
 */
export function useServerRegistry() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const serversRef = collection(db, "servers");
    const q = query(serversRef, orderBy("priority", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const serverList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setServers(serverList);
        setLoading(false);
      },
      (firestoreError) => {
        console.error("[useServerRegistry] Firestore error:", firestoreError);
        setError(firestoreError);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return { servers, loading, error };
}
