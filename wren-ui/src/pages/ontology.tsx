import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Empty, Space, Spin, Typography, message } from 'antd';
import { useQuery, useMutation } from '@apollo/client';
import BulbOutlined from '@ant-design/icons/BulbOutlined';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import { v4 as uuidv4 } from 'uuid';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import OntologyEditor from '@/components/pages/ontology/OntologyEditor';
import useAIOntologyRecommendation, {
  OntologyGraph,
} from '@/hooks/useAIOntologyRecommendation';
import { GET_ONTOLOGY, SAVE_ONTOLOGY } from '@/apollo/client/graphql/ontology';

const { Text } = Typography;

const emptyDefinition: OntologyGraph = { entities: [], relationships: [] };

const withIds = (definition: OntologyGraph): OntologyGraph => ({
  entities: (definition.entities || []).map((e) => ({
    ...e,
    id: e.id || uuidv4(),
  })),
  relationships: (definition.relationships || []).map((r) => ({
    ...r,
    id: r.id || uuidv4(),
  })),
});

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

export default function OntologyPage() {
  const [definition, setDefinition] = useState<OntologyGraph>(emptyDefinition);

  const { data, loading } = useQuery(GET_ONTOLOGY, {
    fetchPolicy: 'no-cache',
  });

  useEffect(() => {
    const def = data?.ontology?.definition;
    if (def) {
      setDefinition(
        withIds(
          stripTypename({
            entities: def.entities || [],
            relationships: def.relationships || [],
          }),
        ),
      );
    }
  }, [data]);

  const onResult = useCallback((result: OntologyGraph) => {
    setDefinition(withIds(result));
  }, []);

  const {
    generating,
    error: aiError,
    elapsed,
    generate,
  } = useAIOntologyRecommendation(onResult);

  const [saveOntology, { loading: saving }] = useMutation(SAVE_ONTOLOGY, {
    onCompleted: () => message.success('Ontology saved.'),
    onError: (error) => message.error(error.message),
  });

  const onSave = () => {
    saveOntology({ variables: { data: stripTypename(definition) } });
  };

  const isEmpty = definition.entities.length === 0;
  const isLoading = loading || generating;

  return (
    <SiderLayout loading={false}>
      <PageLayout
        title="Ontology"
        titleExtra={
          <Space>
            <Button
              icon={<BulbOutlined />}
              loading={generating}
              onClick={generate}
              disabled={isLoading}
            >
              {isEmpty ? 'Generate with AI' : 'Regenerate with AI'}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={onSave}
              disabled={isLoading || isEmpty}
            >
              Save
            </Button>
          </Space>
        }
        description="The business semantic layer (entities and relationships) on top of your data model. Edit and save to update the ontology; entity and attribute descriptions are written back to the model metadata."
      >
        {aiError && (
          <Alert
            message="AI generation failed"
            description={aiError}
            type="error"
            showIcon
            className="my-4"
            closable
          />
        )}
        {generating && (
          <Text type="secondary">
            AI is analyzing your schema to build the ontology
            {elapsed > 0 ? ` (${elapsed}s)` : ''}...
          </Text>
        )}
        <Spin spinning={isLoading}>
          {isEmpty ? (
            <Empty description="No ontology yet. Click 'Generate with AI' to create one.">
              <Button
                icon={<BulbOutlined />}
                loading={generating}
                onClick={generate}
              >
                Generate with AI
              </Button>
            </Empty>
          ) : (
            <OntologyEditor definition={definition} onChange={setDefinition} />
          )}
        </Spin>
      </PageLayout>
    </SiderLayout>
  );
}
