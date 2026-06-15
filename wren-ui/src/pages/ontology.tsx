import { useMemo } from 'react';
import { Empty, Spin, Table, Tag, Typography } from 'antd';
import { useQuery } from '@apollo/client';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import OntologyDiagram from '@/components/pages/ontology/OntologyDiagram';
import { GET_ONTOLOGY } from '@/apollo/client/graphql/ontology';
import { OntologyGraph } from '@/hooks/useAIOntologyRecommendation';

const { Text } = Typography;

const emptyDefinition: OntologyGraph = { entities: [], relationships: [] };

export default function OntologyPage() {
  const { data, loading } = useQuery(GET_ONTOLOGY, {
    fetchPolicy: 'no-cache',
  });

  const definition = useMemo<OntologyGraph>(() => {
    const def = data?.ontology?.definition;
    if (!def) return emptyDefinition;
    return {
      entities: def.entities || [],
      relationships: def.relationships || [],
    };
  }, [data]);

  const isEmpty = definition.entities.length === 0;

  const relationshipColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'From', dataIndex: 'fromEntity', key: 'fromEntity' },
    { title: 'To', dataIndex: 'toEntity', key: 'toEntity' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
  ];

  return (
    <SiderLayout loading={false}>
      <PageLayout
        title="Ontology"
        description="The business semantic layer (entities and relationships) generated on top of your data model and used to ground AI answers."
      >
        <Spin spinning={loading}>
          {isEmpty ? (
            <Empty description="No ontology has been defined for this project yet." />
          ) : (
            <>
              <div
                className="my-4"
                style={{ border: '1px var(--gray-4) solid' }}
              >
                <OntologyDiagram definition={definition} height={460} />
              </div>

              <Typography.Title level={4} className="mt-4">
                Entities
              </Typography.Title>
              {definition.entities.map((entity) => (
                <div key={entity.id || entity.name} className="mb-3">
                  <Text strong>{entity.displayName || entity.name}</Text>
                  <Tag color="purple" className="ml-2">
                    {entity.sourceModel}
                  </Tag>
                  {entity.description && (
                    <div>
                      <Text type="secondary">{entity.description}</Text>
                    </div>
                  )}
                </div>
              ))}

              <Typography.Title level={4} className="mt-4">
                Relationships
              </Typography.Title>
              <Table
                rowKey={(record) => record.id || record.name}
                size="small"
                pagination={false}
                dataSource={definition.relationships}
                columns={relationshipColumns}
              />
            </>
          )}
        </Spin>
      </PageLayout>
    </SiderLayout>
  );
}
