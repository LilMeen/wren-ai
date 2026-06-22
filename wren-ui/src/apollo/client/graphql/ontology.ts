import { gql } from '@apollo/client';

export const ONTOLOGY_FIELDS = gql`
  fragment OntologyFields on OntologyGraph {
    entities {
      id
      name
      displayName
      description
      sourceModel
      attributes {
        name
        sourceColumn
        description
      }
    }
    relationships {
      id
      name
      fromEntity
      toEntity
      type
      description
      sourceRelation
    }
  }
`;

export const GET_ONTOLOGY = gql`
  query Ontology {
    ontology {
      id
      projectId
      status
      generatedBy
      definition {
        ...OntologyFields
      }
    }
  }
  ${ONTOLOGY_FIELDS}
`;

export const GENERATE_ONTOLOGY_RECOMMENDATIONS = gql`
  mutation GenerateOntologyRecommendations {
    generateOntologyRecommendations {
      id
    }
  }
`;

export const GET_ONTOLOGY_RECOMMENDATION_TASK = gql`
  query OntologyRecommendationTask($taskId: String!) {
    ontologyRecommendationTask(taskId: $taskId) {
      status
      definition {
        ...OntologyFields
      }
      error {
        code
        message
        shortMessage
      }
    }
  }
  ${ONTOLOGY_FIELDS}
`;

export const SAVE_ONTOLOGY = gql`
  mutation SaveOntology($data: JSON!) {
    saveOntology(data: $data) {
      id
      projectId
      status
      generatedBy
      definition {
        ...OntologyFields
      }
    }
  }
  ${ONTOLOGY_FIELDS}
`;
