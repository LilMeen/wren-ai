import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import PageLoading from '@/components/PageLoading';
import { Path } from '@/utils/enum';

export interface AuthUser {
  id: number;
  email: string;
  role: 'dev' | 'user' | 'admin';
}

interface AuthContextValue {
  user: AuthUser | null;
  authEnabled: boolean;
  loading: boolean;
  isDev: boolean;
  refetchUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  authEnabled: true,
  loading: true,
  isDev: false,
  refetchUser: async () => {},
  signOut: async () => {},
});

// pages reachable without a session
const PUBLIC_PATHS = [Path.SignIn, Path.SignUp] as string[];

const fetchCurrentUser = async (): Promise<{
  user: AuthUser | null;
  authEnabled: boolean;
}> => {
  const handleResponse = async (response: Response) => {
    const data = await response.json();
    return { user: data.user || null, authEnabled: data.authEnabled !== false };
  };

  const meResponse = await fetch('/api/auth/me');
  if (meResponse.ok) return await handleResponse(meResponse);

  if (meResponse.status === 401) {
    // session expired - try to silently refresh it with the refresh token
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
    });
    if (refreshResponse.ok) return await handleResponse(refreshResponse);
    return { user: null, authEnabled: true };
  }

  // unexpected failure - don't lock the user out of the app
  return { user: null, authEnabled: false };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authEnabled, setAuthEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const refetchUser = useCallback(async () => {
    try {
      const result = await fetchCurrentUser();
      setUser(result.user);
      setAuthEnabled(result.authEnabled);
    } catch (error) {
      console.error('Failed to fetch current user', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } finally {
      setUser(null);
      router.push(Path.SignIn);
    }
  }, [router]);

  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  // route protection: redirect unauthenticated visitors to sign in,
  // and signed-in users away from the auth pages
  const isPublicPath = PUBLIC_PATHS.includes(router.pathname);
  useEffect(() => {
    if (loading || !authEnabled) return;
    if (!user && !isPublicPath) {
      router.replace(Path.SignIn);
    } else if (user && isPublicPath) {
      router.replace(Path.SelectProject);
    }
  }, [loading, authEnabled, user, isPublicPath, router]);

  const value = useMemo(
    () => ({
      user,
      authEnabled,
      loading,
      isDev: user?.role === 'dev' || user?.role === 'admin',
      refetchUser,
      signOut,
    }),
    [user, authEnabled, loading, refetchUser, signOut],
  );

  // hold rendering of protected pages until the session state is known,
  // so protected content never flashes for signed-out visitors
  const blockRender =
    authEnabled && (loading || (!user && !isPublicPath));

  return (
    <AuthContext.Provider value={value}>
      {blockRender ? <PageLoading visible /> : children}
    </AuthContext.Provider>
  );
};

export default function useAuth() {
  return useContext(AuthContext);
}
