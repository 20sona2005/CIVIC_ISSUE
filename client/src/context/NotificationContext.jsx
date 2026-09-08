/**
 * NotificationContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides real-time notification state to the entire app.
 *
 * What it does:
 *  1. Connects to Socket.IO when a user is logged in, disconnects on logout.
 *  2. Joins the correct rooms server-side (handled by the server on connect).
 *  3. Listens for "notification:new" events and prepends them to state.
 *  4. Fetches the initial unread count from REST on mount / login.
 *  5. Exposes helpers: fetchNotifications, markRead, markAllRead.
 *
 * Socket URL: same origin (Vite proxies /socket.io → localhost:5000)
 */

import {
  createContext, useContext, useEffect, useRef,
  useState, useCallback,
} from 'react';
import { io as socketIO } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user }  = useAuth();
  const socketRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);

  // ── Connect / disconnect socket when user changes ────────────────────────
  useEffect(() => {
    if (!user) {
      // User logged out — tear down socket and clear state
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect — Vite proxies /socket.io to the backend
    const socket = socketIO('/', {
      path: '/socket.io',
      query: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] connect error:', err.message);
    });

    // Real-time new notification arrives
    socket.on('notification:new', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] disconnected:', reason);
    });

    // Fetch initial unread count
    fetchUnreadCount();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── REST helpers ─────────────────────────────────────────────────────────

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch {
      // silently fail — badge will just stay at 0
    }
  }, []);

  const fetchNotifications = useCallback(async (limit = 20, skip = 0) => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', {
        params: { limit, skip },
      });
      if (skip === 0) {
        setNotifications(data.notifications);
      } else {
        setNotifications(prev => [...prev, ...data.notifications]);
      }
      setUnreadCount(data.unreadCount);
      return data;
    } catch (err) {
      console.error('[Notifications] fetch error:', err.message);
      return { notifications: [], total: 0, unreadCount: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (notifId) => {
    try {
      await api.patch(`/notifications/${notifId}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === notifId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[Notifications] markRead error:', err.message);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[Notifications] markAllRead error:', err.message);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      markRead,
      markAllRead,
      fetchUnreadCount,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}
