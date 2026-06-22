import { useEffect } from 'react';
import { useRouter } from 'next/router';
import PageLoading from '@/components/PageLoading';
import useAuth from '@/hooks/useAuth';
import { Path } from '@/utils/enum';

export default function Index() {
  const router = useRouter();
  const { authEnabled, user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!authEnabled) {
      router.replace(Path.Home);
    } else if (user) {
      router.replace(Path.SelectProject);
    }
    // unauthenticated users are redirected to sign in by AuthProvider
  }, [loading, authEnabled, user, router]);

  return <PageLoading visible />;
}
