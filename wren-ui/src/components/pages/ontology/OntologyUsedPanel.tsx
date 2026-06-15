import { useMemo } from 'react';
import { Collapse, Space, Tag, Typography } from 'antd';
import { useQuery } from '@apollo/client';
import ApartmentOutlined from '@ant-design/icons/ApartmentOutlined';
import { GET_ONTOLOGY } from '@/apollo/client/graphql/ontology';
import {
  OntologyEntity,
  OntologyGraph,
  OntologyRelationship,
} from '@/hooks/useAIOntologyRecommendation';
import OntologyDiagram from '@/components/pages/ontology/OntologyDiagram';

const { Text } = Typography;

interface Props {
  sql?: string;
}

// figure out which ontology entities/relationships an answer used by matching
// the entity's source model reference name against the generated SQL
const computeUsed = (definition: OntologyGraph, sql: string): OntologyGraph => {
  const normalizedSql = sql.toLowerCase();
  const usedEntities = (definition.entities || []).filter(
    (entity: OntologyEntity) =>
      entity.sourceModel &&
      normalizedSql.includes(entity.sourceModel.toLowerCase()),
  );
  const usedNames = new Set(usedEntities.map((e) => e.name));
  const usedRelationships = (definition.relationships || []).filter(
    (rel: OntologyRelationship) =>
      usedNames.has(rel.fromEntity) && usedNames.has(rel.toEntity),
  );
  return { entities: usedEntities, relationships: usedRelationships };
};

export default function OntologyUsedPanel(props: Props) {
  const { sql } = props;

  const { data } = useQuery(GET_ONTOLOGY, {
    fetchPolicy: 'cache-first',
  });

  const used = useMemo<OntologyGraph | null>(() => {
    const definition = data?.ontology?.definition;
    if (!definition || !sql) return null;
    const result = computeUsed(
      {
        entities: definition.entities || [],
        relationships: definition.relationships || [],
      },
      sql,
    );
    if (result.entities.length === 0) return null;
    return result;
  }, [data, sql]);

  if (!used) return null;

  return (
    <Collapse ghost className="mt-2">
      <Collapse.Panel
        key="ontology-used"
        header={
          <Space>
            <ApartmentOutlined className="geekblue-5" />
            <Text className="gray-7">
              Ontology used &middot; {used.entities.length} entities
              {used.relationships.length > 0
                ? `, ${used.relationships.length} relationships`
                : ''}
            </Text>
          </Space>
        }
      >
        <Space wrap className="mb-2">
          {used.entities.map((entity) => (
            <Tag color="purple" key={entity.id || entity.name}>
              {entity.displayName || entity.name}
            </Tag>
          ))}
        </Space>
        {used.relationships.length > 0 && (
          <div
            className="mb-2"
            style={{ border: '1px var(--gray-4) solid', borderRadius: 4 }}
          >
            <OntologyDiagram definition={used} height={240} compact />
          </div>
        )}
      </Collapse.Panel>
    </Collapse>
  );
}
