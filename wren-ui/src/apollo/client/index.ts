import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import errorHandler from '@/utils/errorHandler';

const apolloErrorLink = onError((error) => errorHandler(error));

const projectLink = setContext((_, { headers }) => {
  const projectId =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('wren:selectedProjectId')
      : null;
  return {
    headers: {
      ...headers,
      ...(projectId ? { 'x-project-id': projectId } : {}),
    },
  };
});

const httpLink = new HttpLink({
  uri: '/api/graphql',
});

const client = new ApolloClient({
  link: from([apolloErrorLink, projectLink, httpLink]),
  cache: new InMemoryCache(),
  ssrMode: typeof window === 'undefined',
});

export default client;
