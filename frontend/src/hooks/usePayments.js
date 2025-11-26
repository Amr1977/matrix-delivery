import { useState, useCallback } from 'react';
import api from '../api';

const usePayments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);

  const createPaymentIntent = useCallback(async (orderId, amount, currency = 'usd') => {
    setLoading(true);
    setError('');

    try {
      const result = await api.createPaymentIntent(orderId, amount, currency);
      return result.paymentIntent;
    } catch (err) {
      const errorMessage = err.message || 'Failed to create payment intent';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPaymentDetails = useCallback(async (orderId) => {
    setLoading(true);
    setError('');

    try {
      const result = await api.getPaymentDetails(orderId);
      return result.payment;
    } catch (err) {
      const errorMessage = err.message || 'Failed to get payment details';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const processRefund = useCallback(async (paymentId, amount, reason) => {
    setLoading(true);
    setError('');

    try {
      const result = await api.processRefund(paymentId, amount, reason);
      return result.refund;
    } catch (err) {
      const errorMessage = err.message || 'Failed to process refund';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await api.getPaymentMethods();
      setPaymentMethods(result.paymentMethods);
      return result.paymentMethods;
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch payment methods';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const addPaymentMethod = useCallback(async (paymentMethodId) => {
    setLoading(true);
    setError('');

    try {
      const result = await api.addPaymentMethod(paymentMethodId);
      // Refresh payment methods list
      await fetchPaymentMethods();
      return result.paymentMethod;
    } catch (err) {
      const errorMessage = err.message || 'Failed to add payment method';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchPaymentMethods]);

  const deletePaymentMethod = useCallback(async (methodId) => {
    setLoading(true);
    setError('');

    try {
      await api.deletePaymentMethod(methodId);
      // Remove from local state
      setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete payment method';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    paymentMethods,
    createPaymentIntent,
    getPaymentDetails,
    processRefund,
    fetchPaymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    setError
  };
};

export default usePayments;
