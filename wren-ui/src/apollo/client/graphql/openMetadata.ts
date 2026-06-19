import { gql } from '@apollo/client';

export const LIST_OPEN_METADATA_SERVICES = gql`
  query ListOpenMetadataServices {
    listOpenMetadataServices {
      name
      serviceType
      description
      hostPort
      username
    }
  }
`;

export const LIST_OPEN_METADATA_GLOSSARIES = gql`
  query ListOpenMetadataGlossaries {
    listOpenMetadataGlossaries {
      name
      displayName
      description
    }
  }
`;

export const SAVE_OPEN_METADATA_CONFIG = gql`
  mutation SaveOpenMetadataConfig($data: OpenMetadataProjectConfigInput!) {
    saveOpenMetadataConfig(data: $data)
  }
`;

export const IMPORT_OPEN_METADATA_GLOSSARY = gql`
  mutation ImportOpenMetadataGlossary($glossaryNames: [String!]!) {
    importOpenMetadataGlossary(glossaryNames: $glossaryNames) {
      id
      projectId
      instruction
      questions
      isDefault
    }
  }
`;

export const RESYNC_OPEN_METADATA_DESCRIPTIONS = gql`
  mutation ResyncOpenMetadataDescriptions {
    resyncOpenMetadataDescriptions
  }
`;
