import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { sellerApi } from '../services/sellerApi';
import { defaultEarnings } from '../context/SellerEarningsContext';
import {
  getOrderSocket,
  onSellerOrderNew,
  onPurchaseRequestNew,
} from '@core/services/orderSocket';

const POLL_INTERVAL_MS = 15000;
const ALERT_SOUND_URL =
  'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const isEarningsRoute = (path) =>
  path.includes('earnings') || path.includes('withdrawals') || path.includes('transactions');

export function secondsLeftUntilSellerExpiry(order) {
  if (!order) return 0;
  const raw = order.sellerPendingExpiresAt ?? order.expiresAt;
  if (!raw) return 60;
  const ms = new Date(raw).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 1000));
}

function playAlertSound() {
  new Audio(ALERT_SOUND_URL).play().catch(() => {});
}

/**
 * Single seller dashboard data source: one poll loop, orders context, alerts, earnings.
 */
export function useSellerDashboard(enabled) {
  const navigate = useNavigate();
  const location = useLocation();

  const [sellerOrders, setSellerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [sellerEarningsData, setSellerEarningsData] = useState(defaultEarnings);
  const [earningsLoading, setEarningsLoading] = useState(false);

  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [shownOrderIds, setShownOrderIds] = useState(() => new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const acceptWindowTotalRef = useRef(60);

  const shownOrderIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);
  const newOrderAlertRef = useRef(null);
  const fetchOrdersRef = useRef(null);
  const earningsFetchedRef = useRef(false);

  useEffect(() => {
    shownOrderIdsRef.current = shownOrderIds;
  }, [shownOrderIds]);

  useEffect(() => {
    newOrderAlertRef.current = newOrderAlert;
  }, [newOrderAlert]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await sellerApi.getOrders();
      if (!res?.data?.success) return;

      const payload = res.data.result || {};
      const rawOrders = Array.isArray(payload.items)
        ? payload.items
        : res.data.results || [];
      const allOrders = Array.isArray(rawOrders) ? rawOrders : [];
      setSellerOrders(allOrders);

      const pendingOrders = allOrders.filter((o) => {
        if (o.hubFlowEnabled) return false;
        if (o.requiresAction !== undefined) return o.requiresAction;
        const ws = (o.workflowStatus || '').toUpperCase();
        if (ws === 'SELLER_PENDING') return true;
        return (o?.status || '').toLowerCase() === 'pending';
      });

      if (isFirstLoadRef.current) {
        const existingIds = new Set(pendingOrders.map((o) => o.orderId).filter(Boolean));
        shownOrderIdsRef.current = existingIds;
        isFirstLoadRef.current = false;
        setShownOrderIds(existingIds);
        return;
      }

      const newOrder = pendingOrders.find((o) => !shownOrderIdsRef.current.has(o.orderId));
      if (newOrder && !newOrderAlertRef.current) {
        setNewOrderAlert(newOrder);
        setShownOrderIds((prev) => new Set(prev).add(newOrder.orderId));
        shownOrderIdsRef.current = new Set(shownOrderIdsRef.current).add(newOrder.orderId);
        newOrderAlertRef.current = newOrder;
        playAlertSound();
      }
    } catch (error) {
      console.error('Seller order polling error:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      isFirstLoadRef.current = true;
      setSellerOrders([]);
      setOrdersLoading(false);
      setNewOrderAlert(null);
      return undefined;
    }

    fetchOrdersRef.current = fetchOrders;
    fetchOrders();
    const id = setInterval(() => fetchOrdersRef.current?.(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, fetchOrders]);

  useEffect(() => {
    if (!enabled) return undefined;

    const getToken = () => localStorage.getItem('auth_seller');
    getOrderSocket(getToken);

    const unsubOrder = onSellerOrderNew(getToken, () => fetchOrdersRef.current?.());
    const unsubPr = onPurchaseRequestNew(getToken, (payload) => {
      const id = payload?.orderId || 'New';
      toast.info(`New Purchase Request for order #${id}!`, {
        description: `Items: ${payload.itemsCount || 1}`,
        action: { label: 'VIEW', onClick: () => navigate('/seller/procurement') },
      });
      playAlertSound();
      fetchOrdersRef.current?.();
    });

    return () => {
      unsubOrder();
      unsubPr();
    };
  }, [enabled, navigate]);

  useEffect(() => {
    if (!newOrderAlert) return undefined;
    const left = secondsLeftUntilSellerExpiry(newOrderAlert);
    if (left <= 0) {
      setNewOrderAlert(null);
      toast.error('This order has already expired — you can no longer accept it.');
      return undefined;
    }
    acceptWindowTotalRef.current = left;
    setTimeLeft(left);
    const timer = setInterval(() => {
      const next = secondsLeftUntilSellerExpiry(newOrderAlertRef.current);
      setTimeLeft(next);
      if (next <= 0) {
        clearInterval(timer);
        setNewOrderAlert(null);
        toast.error('Order timed out!');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [newOrderAlert]);

  useEffect(() => {
    if (!enabled || !isEarningsRoute(location.pathname)) {
      if (!isEarningsRoute(location.pathname)) earningsFetchedRef.current = false;
      return;
    }
    if (earningsFetchedRef.current) return;
    earningsFetchedRef.current = true;
    setEarningsLoading(true);
    sellerApi
      .getEarnings()
      .then((response) => {
        const raw = response?.data?.result ?? response?.data?.data;
        if (response?.data?.success && raw && typeof raw === 'object') {
          setSellerEarningsData({
            balances: raw.balances ?? {},
            ledger: Array.isArray(raw.ledger) ? raw.ledger : [],
            monthlyChart: Array.isArray(raw.monthlyChart) ? raw.monthlyChart : [],
          });
        }
      })
      .catch((err) => console.error('Earnings fetch error:', err))
      .finally(() => setEarningsLoading(false));
  }, [enabled, location.pathname]);

  const refreshOrders = useCallback(() => {
    fetchOrdersRef.current?.();
  }, []);

  const refreshEarnings = useCallback(() => {
    earningsFetchedRef.current = false;
    setEarningsLoading(true);
    sellerApi
      .getEarnings()
      .then((response) => {
        const raw = response?.data?.result ?? response?.data?.data;
        if (response?.data?.success && raw && typeof raw === 'object') {
          setSellerEarningsData({
            balances: raw.balances ?? {},
            ledger: Array.isArray(raw.ledger) ? raw.ledger : [],
            monthlyChart: Array.isArray(raw.monthlyChart) ? raw.monthlyChart : [],
          });
        }
      })
      .catch((err) => console.error('Earnings fetch error:', err))
      .finally(() => {
        setEarningsLoading(false);
        earningsFetchedRef.current = true;
      });
  }, []);

  const handleAcceptOrder = useCallback(async (order) => {
    const orderId = order.orderId;
    try {
      if (order.hubFlowEnabled) {
        const prRes = await sellerApi.getPurchaseRequests({ orderId });
        const prs = prRes.data?.result?.items || prRes.data?.results || [];
        const myPr = prs.find((p) => p.status === 'created' || p.status === 'pending');
        if (myPr) {
          await sellerApi.respondPurchaseRequest(myPr._id, { action: 'accept' });
          toast.success(`Purchase Request for #${orderId} Accepted!`);
        } else {
          await sellerApi.updateOrderStatus(orderId, { status: 'confirmed' });
          toast.success(`Order #${orderId} Accepted (Direct)!`);
        }
      } else {
        await sellerApi.updateOrderStatus(orderId, { status: 'confirmed' });
        toast.success(`Order #${orderId} Accepted!`);
      }
      setNewOrderAlert(null);
      refreshOrders();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to accept order');
    }
  }, [refreshOrders]);

  const handleDeclineOrder = useCallback(async (orderId) => {
    try {
      await sellerApi.updateOrderStatus(orderId, { status: 'cancelled' });
      toast.error(`Order #${orderId} Declined`);
      setNewOrderAlert(null);
      refreshOrders();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update order');
    }
  }, [refreshOrders]);

  return {
    sellerOrders,
    ordersLoading,
    sellerEarningsData,
    earningsLoading,
    refreshOrders,
    refreshEarnings,
    newOrderAlert,
    timeLeft,
    acceptWindowTotalRef,
    handleAcceptOrder,
    handleDeclineOrder,
  };
}
