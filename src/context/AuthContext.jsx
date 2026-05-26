import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi.js';
import { getApiErrorMessage } from '../api/axiosClient.js';
import { wsService } from '../services/wsService.js';
import {
  clearSessionStorage,
  getStoredUser,
  getToken,
  setRefreshToken,
  setStoredRole,
  setStoredUser,
  setToken
} from '../storage/tokenStorage.js';
import { isSelfServiceMobileRole } from '../utils/permissions.js';

const AuthContext = createContext(null);

function normalizeLoginResponse(data) {
  return {
    token: data?.token || data?.access || data?.access_token,
    refresh: data?.refresh || data?.refresh_token,
    user: data?.user || data?.employee || null,
    role: data?.role || data?.user?.role || data?.employee?.role,
    mustChangePassword: Boolean(data?.must_change_password || data?.user?.must_change_password || data?.employee?.must_change_password)
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [authError, setAuthError] = useState('');

  const restoreSession = useCallback(async () => {
    setAuthError('');
    const token = await getToken();
    const cachedUser = await getStoredUser();

    if (!token) {
      setUser(null);
      setTokenReady(true);
      return;
    }

    if (cachedUser) setUser(cachedUser);

    try {
      const data = await authApi.me();
      const nextUser = data?.user || data?.employee || data;
      const role = data?.role || nextUser?.role;
      if (role && !isSelfServiceMobileRole(role)) {
        await clearSessionStorage();
        setUser(null);
        setAuthError('This mobile app is only for employee self-service users.');
        return;
      }
      setUser(nextUser);
      await setStoredUser(nextUser);
      const empCode = nextUser?.employee_code || nextUser?.code;
      if (empCode && token) wsService.connect(empCode, token);
    } catch (error) {
      await clearSessionStorage();
      setUser(null);
      setAuthError(getApiErrorMessage(error, 'Session expired. Please login again.'));
    } finally {
      setTokenReady(true);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (credentials) => {
    setAuthError('');
    const data = await authApi.login(credentials);
    const { token, refresh, user: loginUser, role, mustChangePassword } = normalizeLoginResponse(data);

    if (!token) {
      throw new Error('Login response did not include a token.');
    }

    if (!isSelfServiceMobileRole(role)) {
      await clearSessionStorage();
      throw new Error('This mobile app is only for employee self-service users.');
    }

    await setToken(token);
    await setRefreshToken(refresh);
    await setStoredUser(loginUser);
    await setStoredRole(role);
    setUser(loginUser);
    const empCode = loginUser?.employee_code || loginUser?.code;
    if (empCode) wsService.connect(empCode, token);
    return { user: loginUser, mustChangePassword };
  }, []);

  const logout = useCallback(async () => {
    wsService.disconnect();
    try {
      await authApi.logout();
    } catch {
      // Logout must still clear the local session if the API is unreachable.
    } finally {
      await clearSessionStorage();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), tokenReady, authError, login, logout, restoreSession }),
    [authError, login, logout, restoreSession, tokenReady, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
