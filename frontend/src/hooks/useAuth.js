import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Login state and actions, from anywhere inside AuthProvider:
 *
 *   const { user, login, logout } = useAuth();
 *
 * @returns {{
 *   token: string | null,
 *   user: { id: string, name: string, email: string } | null,
 *   isLoading: boolean,
 *   login: (email: string, password: string) => Promise<void>,
 *   register: (name: string, email: string, password: string) => Promise<void>,
 *   logout: () => Promise<void>,
 *   deleteAccount: () => Promise<void>,
 * }}
 */
export default function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
