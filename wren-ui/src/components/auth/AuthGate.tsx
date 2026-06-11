import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Spin } from 'antd';
import { CURRENT_USER } from '@/apollo/client/graphql/auth';
import { Path } from '@/utils/enum';

const PUBLIC_PATHS = new Set([Path.SignIn, Path.SignUp]);
const PROJECT_REQUIRED_PREFIXES = [
  Path.Home,
  Path.Modeling,
  Path.Knowledge,
  Path.APIManagement,
];

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isServer = typeof window === 'undefined';
  const isPublicPage = PUBLIC_PATHS.has(router.pathname as Path);
  const requiresProject = PROJECT_REQUIRED_PREFIXES.some((path) =>
    router.pathname.startsWith(path),
  );
  const { data, loading } = useQuery(CURRENT_USER, {
    fetchPolicy: 'network-only',
    skip: isServer || isPublicPage,
  });

  useEffect(() => {
    if (!isPublicPage && !loading && !data?.currentUser) {
      router.replace(Path.SignIn);
      return;
    }
    if (
      !isPublicPage &&
      !loading &&
      data?.currentUser &&
      requiresProject &&
      !window.localStorage.getItem('wren:selectedProjectId')
    ) {
      router.replace(Path.Projects);
    }
  }, [data?.currentUser, isPublicPage, loading, requiresProject, router]);

  if (isServer || isPublicPage) {
    return <>{children}</>;
  }

  if (loading || !data?.currentUser) {
    return (
      <div
        className="d-flex justify-center align-center"
        style={{ height: '100vh' }}
      >
        <Spin />
      </div>
    );
  }

  return <>{children}</>;
}
