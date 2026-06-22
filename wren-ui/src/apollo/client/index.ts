import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import errorHandler from '@/utils/errorHandler';

const SIGN_IN_PATH = '/auth/signin';

const apolloErrorLink = onError((error) => {
  // session expired or signed out in another tab: send the user to sign in
  const isUnauthenticated = (error.graphQLErrors || []).some(
    (graphQLError) => graphQLError.extensions?.code === 'UNAUTHENTICATED',
  );
  if (isUnauthenticated && typeof window !== 'undefined') {
    if (!window.location.pathname.startsWith('/auth')) {
      window.location.href = SIGN_IN_PATH;
    }
    return;
  }
  errorHandler(error);
});

const httpLink = new HttpLink({
  uri: '/api/graphql',
});

const client = new ApolloClient({
  link: from([apolloErrorLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;
