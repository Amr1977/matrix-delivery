import { useState, useEffect, useCallback } from 'react';

const useOrders = (token) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL;

  const fetchOrders = useCallback(async (filters = {}) => {
    if (!token) return;

    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (filters.country) queryParams.append('country', filters.country);
      if (filters.city) queryParams.append('city', filters.city);
      if (filters.area) queryParams.append('area', filters.area);

      const queryString = queryParams.toString();
      const url = queryString ? `${API_URL}/orders?${queryString}` : `${API_URL}/orders`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data);
      setError('');
    } catch (err) {
      console.error('fetchOrders error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  const createOrder = useCallback(async (orderData) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create order');
      }

      const newOrder = await response.json();
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  const placeBid = useCallback(async (orderId, bidData) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/orders/${orderId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bidData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to place bid');
      }

      const updatedOrder = await response.json();
      setOrders(prev => prev.map(order =>
        order._id === orderId ? updatedOrder : order
      ));
      return updatedOrder;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  const acceptBid = useCallback(async (orderId, userId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/orders/${orderId}/accept-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept bid');
      }

      const updatedOrder = await response.json();
      setOrders(prev => prev.map(order =>
        order._id === orderId ? updatedOrder : order
      ));
      return updatedOrder;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  const updateOrderStatus = useCallback(async (orderId, action) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`Failed to ${action} order`);

      const updatedOrder = await response.json();
      setOrders(prev => prev.map(order =>
        order._id === orderId ? { ...order, status: updatedOrder.status } : order
      ));
      return updatedOrder;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token, fetchOrders]);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    placeBid,
    acceptBid,
    updateOrderStatus,
    clearError: () => setError('')
  };
};

export default useOrders;
