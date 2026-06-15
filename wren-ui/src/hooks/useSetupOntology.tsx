import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@apollo/client';
import { SETUP, Path } from '@/utils/enum';
import { GET_ONTOLOGY, SAVE_ONTOLOGY } from '@/apollo/client/graphql/ontology';
import { OntologyGraph } from '@/hooks/useAIOntologyRecommendation';

const emptyDefinition: OntologyGraph = { entities: [], relationships: [] };

// recursively drop Apollo's __typename before sending the graph back as JSON
const stripTypename = (value: any): any => {
  if (Array.isArray(value)) return value.map(stripTypename);
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce(
      (acc, [key, val]) => {
        if (key === '__typename') return acc;
        acc[key] = stripTypename(val);
        return acc;
      },
      {} as Record<string, any>,
    );
  }
  return value;
};

export default function useSetupOntology() {
  const [stepKey] = useState(SETUP.DEFINE_ONTOLOGY);
  const router = useRouter();

  const { data, loading: fetching } = useQuery(GET_ONTOLOGY, {
    fetchPolicy: 'no-cache',
  });

  const onFinish = () => {
    router.push(Path.Modeling);
  };

  const [saveOntologyMutation, { loading: submitting }] = useMutation(
    SAVE_ONTOLOGY,
    {
      onError: (error) => console.error(error),
      onCompleted: onFinish,
    },
  );

  const onBack = () => {
    router.push(Path.OnboardingRelationships);
  };

  const onNext = async (payload: { definition: OntologyGraph }) => {
    const definition = stripTypename(payload.definition);
    if (!definition?.entities?.length && !definition?.relationships?.length) {
      onFinish();
      return;
    }
    await saveOntologyMutation({ variables: { data: definition } });
  };

  const initialDefinition = useMemo<OntologyGraph>(() => {
    const definition = data?.ontology?.definition;
    if (!definition) return emptyDefinition;
    return stripTypename({
      entities: definition.entities || [],
      relationships: definition.relationships || [],
    });
  }, [data]);

  return {
    fetching,
    submitting,
    stepKey,
    initialDefinition,
    onBack,
    onNext,
    onSkip: onFinish,
  };
}
