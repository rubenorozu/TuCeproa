import React, { useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createContext } from 'react'; // Importar createContext de forma separada

interface UserSession {
  id: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface SessionContextType {
  user: UserSession | null;
  loading: boolean;
  login: (userData: UserSession) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
  }, [refreshTrigger]); // Dependencia en refreshTrigger para que fetchSession se actualice

  useEffect(() => {
    fetchSession();
  }, [fetchSession]); // Ahora fetchSession es estable y useEffect se ejecuta cuando fetchSession cambia (por refreshTrigger)

  const login = (userData: UserSession) => {
    setUser(userData);
    setRefreshTrigger(prev => prev + 1); // Trigger a session refresh
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const refreshSession = async () => {
    console.log('DEBUG SessionContext: refreshSession llamado. Incrementando trigger.');
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <SessionContext.Provider value={{ user, loading, login, logout, refreshSession }}>
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