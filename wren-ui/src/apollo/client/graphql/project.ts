import { gql } from '@apollo/client';

export const PROJECTS = gql`
  query Projects {
    projects {
      id
      displayName
      description
      owner {
        id
        email
      }
    }
  }
`;
