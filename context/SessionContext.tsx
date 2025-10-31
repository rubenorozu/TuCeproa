import React, { useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createContext } from 'react';

interface UserSession {
  id: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface Notification {
  id: string;
  message: string;
  read: boolean;
}

interface SessionContextType {
  user: UserSession | null;
  loading: boolean;
  login: (userData: UserSession) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchSession = useCallback(async () => {
    console.log('DEBUG SessionContext: fetchSession llamado. refreshTrigger:', refreshTrigger);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser({ id: data.user.id, role: data.user.role, firstName: data.user.firstName, lastName: data.user.lastName, email: data.user.email });
          console.log('DEBUG SessionContext: Usuario establecido:', data.user.email);
        } else {
          setUser(null);
          console.log('DEBUG SessionContext: No hay usuario en la respuesta.');
        }
      } else {
        setUser(null);
        console.log('DEBUG SessionContext: Respuesta no OK de /api/auth/session.');
      }
    } catch (error) {
      console.error('DEBUG SessionContext: Error fetching session:', error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log('DEBUG SessionContext: Carga de sesión finalizada. Loading:', false);
    }
  }, [refreshTrigger]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, { method: 'PUT', credentials: 'include' });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const eventSource = new EventSource('/api/notifications/events');
      eventSource.onmessage = (event) => {
        const newNotifications = JSON.parse(event.data);
        setNotifications((prevNotifications) => [...newNotifications, ...prevNotifications]);
        setUnreadCount((prev) => prev + newNotifications.length);
      };

      return () => {
        eventSource.close();
      };
    }
  }, [user, fetchNotifications]);

  const login = (userData: UserSession) => {
    setUser(userData);
    setRefreshTrigger(prev => prev + 1);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const refreshSession = async () => {
    console.log('DEBUG SessionContext: refreshSession llamado. Incrementando trigger.');
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <SessionContext.Provider value={{ user, loading, login, logout, refreshSession, notifications, unreadCount, fetchNotifications, markNotificationAsRead }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
