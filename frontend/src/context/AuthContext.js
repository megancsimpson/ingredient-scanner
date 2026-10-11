import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as api from '../services/api';

// Where the token is kept on the device. SecureStore uses the iOS Keychain
// and Android Keystore, so other apps can't read it.
const TOKEN_KEY = 'authToken';

export const AuthContext = createContext(null);

/**
 * Holds the login state for the whole app: the token, the user, and
 * login/register/logout functions. Use it through the useAuth() hook.
 *
 * The token is saved in SecureStore so the user stays logged in after
 * closing the app.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  // True while checking for a saved login when the app opens
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    api.setAuthToken(null);
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }, []);

  // Log out automatically if the server rejects the token
  useEffect(() => {
    api.setUnauthorizedHandler(logout);
    return () => api.setUnauthorizedHandler(null);
  }, [logout]);

  // When the app opens, restore a saved login
  useEffect(() => {
    async function restoreLogin() {
      const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!savedToken) return;

      api.setAuthToken(savedToken);
      try {
        // Check the token still works and get the user's details
        const { user: savedUser } = await api.getMe();
        setUser(savedUser);
        setToken(savedToken);
      } catch (err) {
        // A 401 means the token expired; the unauthorized handler has already
        // logged out. Any other error (e.g. no internet) shouldn't log the
        // user out, so keep the token; the user's details load next time.
        if (err.status !== 401) setToken(savedToken);
      }
    }

    restoreLogin()
      .catch(() => {}) // SecureStore failed; treat as logged out
      .finally(() => setIsLoading(false));
  }, []);

  // Shared by login and register: both return { token, user }
  const startSession = useCallback(async ({ token: newToken, user: newUser }) => {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    api.setAuthToken(newToken);
    setUser(newUser);
    setToken(newToken);
  }, []);

  const login = useCallback(
    async (email, password) => startSession(await api.login({ email, password })),
    [startSession]
  );

  const register = useCallback(
    async (name, email, password) => startSession(await api.register({ name, email, password })),
    [startSession]
  );

  // Deletes the account on the server, then clears the login on the device,
  // which takes the user back to the login screen
  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    await logout();
  }, [logout]);

  // useMemo keeps the same object between renders unless something changes,
  // so screens using useAuth() don't re-render for no reason
  const value = useMemo(
    () => ({ token, user, isLoading, login, register, logout, deleteAccount }),
    [token, user, isLoading, login, register, logout, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
