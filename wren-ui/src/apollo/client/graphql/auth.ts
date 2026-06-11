import { gql } from '@apollo/client';

export const CURRENT_USER = gql`
  query CurrentUser {
    currentUser {
      id
      email
      role
    }
  }
`;

export const SIGN_IN = gql`
  mutation SignIn($data: SignInInput!) {
    signIn(data: $data) {
      user {
        id
        email
        role
      }
    }
  }
`;

export const SIGN_UP = gql`
  mutation SignUp($data: SignUpInput!) {
    signUp(data: $data) {
      user {
        id
        email
        role
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;
