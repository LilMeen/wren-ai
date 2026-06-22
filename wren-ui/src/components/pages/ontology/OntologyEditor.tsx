import {
  Col,
  Collapse,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import { Button } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import {
  OntologyEntity,
  OntologyGraph,
  OntologyRelationship,
} from '@/hooks/useAIOntologyRecommendation';
import OntologyDiagram from '@/components/pages/ontology/OntologyDiagram';

const { Title, Text } = Typography;
const { TextArea } = Input;

const RELATION_TYPES = ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE'];

interface Props {
  definition: OntologyGraph;
  onChange: (definition: OntologyGraph) => void;
}

export default function OntologyEditor(props: Props) {
  const { definition, onChange } = props;

  const updateEntity = (id: string, patch: Partial<OntologyEntity>) => {
    onChange({
      ...definition,
      entities: definition.entities.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    });
  };

  const updateAttributeDescription = (
    entityId: string,
    attrName: string,
    description: string,
  ) => {
    onChange({
      ...definition,
      entities: definition.entities.map((e) =>
        e.id === entityId
          ? {
              ...e,
              attributes: (e.attributes || []).map((a) =>
                a.name === attrName ? { ...a, description } : a,
              ),
            }
          : e,
      ),
    });
  };

  const updateRelationship = (
    id: string,
    patch: Partial<OntologyRelationship>,
  ) => {
    onChange({
      ...definition,
      relationships: definition.relationships.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    });
  };

  const deleteRelationship = (id: string) => {
    onChange({
      ...definition,
      relationships: definition.relationships.filter((r) => r.id !== id),
    });
  };

  const addRelationship = () => {
    const firstEntity = definition.entities[0]?.name || '';
    const secondEntity =
      definition.entities[1]?.name || definition.entities[0]?.name || '';
    onChange({
      ...definition,
      relationships: [
        ...definition.relationships,
        {
          id: uuidv4(),
          name: 'New relationship',
          fromEntity: firstEntity,
          toEntity: secondEntity,
          type: 'MANY_TO_ONE',
          description: '',
        },
      ],
    });
  };

  const entityOptions = definition.entities.map((e) => ({
    label: e.displayName || e.name,
    value: e.name,
  }));

  const relationshipColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      width: '24%',
      render: (name: string, rel: OntologyRelationship) => (
        <Input
          value={name}
          onChange={(e) => updateRelationship(rel.id, { name: e.target.value })}
        />
      ),
    },
    {
      title: 'From',
      dataIndex: 'fromEntity',
      width: '20%',
      render: (fromEntity: string, rel: OntologyRelationship) => (
        <Select
          value={fromEntity}
          options={entityOptions}
          className="w-100"
          onChange={(value) =>
            updateRelationship(rel.id, { fromEntity: value })
          }
        />
      ),
    },
    {
      title: 'To',
      dataIndex: 'toEntity',
      width: '20%',
      render: (toEntity: string, rel: OntologyRelationship) => (
        <Select
          value={toEntity}
          options={entityOptions}
          className="w-100"
          onChange={(value) => updateRelationship(rel.id, { toEntity: value })}
        />
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: '20%',
      render: (type: string, rel: OntologyRelationship) => (
        <Select
          value={type}
          options={RELATION_TYPES.map((t) => ({ label: t, value: t }))}
          className="w-100"
          onChange={(value) => updateRelationship(rel.id, { type: value })}
        />
      ),
    },
    {
      title: '',
      key: 'action',
      width: 48,
      align: 'center' as const,
      render: (_: any, rel: OntologyRelationship) => (
        <Popconfirm
          title="Confirm to delete?"
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => deleteRelationship(rel.id)}
        >
          <DeleteOutlined />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <div className="my-4" style={{ border: '1px var(--gray-4) solid' }}>
        <OntologyDiagram definition={definition} height={360} />
      </div>

      <Title level={3} className="mt-6 mb-2">
        Entities
      </Title>
      <Collapse>
        {definition.entities.map((entity) => (
          <Collapse.Panel
            key={entity.id}
            header={
              <Space>
                <Text strong>{entity.displayName || entity.name}</Text>
                <Tag color="purple">{entity.sourceModel}</Tag>
              </Space>
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">Semantic name</Text>
                <Input
                  value={entity.name}
                  onChange={(e) =>
                    updateEntity(entity.id, { name: e.target.value })
                  }
                />
              </Col>
              <Col span={12}>
                <Text type="secondary">Display name</Text>
                <Input
                  value={entity.displayName}
                  onChange={(e) =>
                    updateEntity(entity.id, { displayName: e.target.value })
                  }
                />
              </Col>
            </Row>
            <div className="mt-3">
              <Text type="secondary">Description</Text>
              <TextArea
                value={entity.description}
                autoSize={{ minRows: 2 }}
                onChange={(e) =>
                  updateEntity(entity.id, { description: e.target.value })
                }
              />
            </div>
            {(entity.attributes || []).length > 0 && (
              <div className="mt-3">
                <Text type="secondary">Attributes</Text>
                {(entity.attributes || []).map((attr) => (
                  <Row
                    gutter={8}
                    key={attr.name}
                    className="mt-1"
                    align="middle"
                  >
                    <Col span={8}>
                      <Text>{attr.name}</Text>
                      <Text type="secondary" className="ml-1">
                        ({attr.sourceColumn})
                      </Text>
                    </Col>
                    <Col span={16}>
                      <Input
                        size="small"
                        placeholder="Description"
                        value={attr.description}
                        onChange={(e) =>
                          updateAttributeDescription(
                            entity.id,
                            attr.name,
                            e.target.value,
                          )
                        }
                      />
                    </Col>
                  </Row>
                ))}
              </div>
            )}
          </Collapse.Panel>
        ))}
      </Collapse>

      <div className="d-flex justify-space-between align-center mt-6 mb-2">
        <Title level={3} className="mb-0">
          Relationships
        </Title>
        <Button size="small" onClick={addRelationship}>
          <PlusOutlined />
          Add
        </Button>
      </div>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={definition.relationships}
        columns={relationshipColumns}
      />
    </>
  );
}
