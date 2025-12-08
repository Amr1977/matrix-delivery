import { useState, useEffect, useCallback } from 'react';
import { OrdersApi, Order, OrderFilters, CreateOrderRequest, PlaceBidRequest } from '../services/api';

const useOrders = (token: string | null) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchOrders = useCallback(async (filters: OrderFilters = {}) => {
        if (!token) return;

        try {
            setLoading(true);
            const data = await OrdersApi.getOrders(filters);
            setOrders(data);
            setError('');
        } catch (err: any) {
            console.error('fetchOrders error:', err);
            setError(err.error || err.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const createOrder = useCallback(async (orderData: CreateOrderRequest) => {
        try {
            setLoading(true);
            const newOrder = await OrdersApi.createOrder(orderData);
            setOrders(prev => [newOrder, ...prev]);
            return newOrder;
        } catch (err: any) {
            const errorMsg = err.error || err.message || 'Failed to create order';
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const placeBid = useCallback(async (orderId: string, bidData: PlaceBidRequest) => {
        try {
            setLoading(true);
            const updatedOrder = await OrdersApi.placeBid(orderId, bidData);
            setOrders(prev => prev.map(order =>
                order._id === orderId ? updatedOrder : order
            ));
            return updatedOrder;
        } catch (err: any) {
            const errorMsg = err.error || err.message || 'Failed to place bid';
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const acceptBid = useCallback(async (orderId: string, userId: string) => {
        try {
            setLoading(true);
            const updatedOrder = await OrdersApi.acceptBid(orderId, { userId });
            setOrders(prev => prev.map(order =>
                order._id === orderId ? updatedOrder : order
            ));
            return updatedOrder;
        } catch (err: any) {
            const errorMsg = err.error || err.message || 'Failed to accept bid';
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const updateOrderStatus = useCallback(async (orderId: string, action: string) => {
        try {
            setLoading(true);
            const updatedOrder = await OrdersApi.updateStatus(orderId, action);
            setOrders(prev => prev.map(order =>
                order._id === orderId ? { ...order, status: updatedOrder.status } : order
            ));
            return updatedOrder;
        } catch (err: any) {
            const errorMsg = err.error || err.message || `Failed to ${action} order`;
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [token]);

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
