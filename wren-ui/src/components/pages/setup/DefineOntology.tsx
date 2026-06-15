import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Collapse,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import BulbOutlined from '@ant-design/icons/BulbOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import { v4 as uuidv4 } from 'uuid';
import useAIOntologyRecommendation, {
  OntologyEntity,
  OntologyGraph,
  OntologyRelationship,
} from '@/hooks/useAIOntologyRecommendation';
import OntologyDiagram from '@/components/pages/ontology/OntologyDiagram';

const { Title, Text } = Typography;
const { TextArea } = Input;

const RELATION_TYPES = ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE'];

interface Props {
  fetching: boolean;
  initialDefinition: OntologyGraph;
  onNext: (data: { definition: OntologyGraph }) => void;
  onBack: () => void;
  onSkip: () => void;
  submitting: boolean;
}

const emptyDefinition: OntologyGraph = { entities: [], relationships: [] };

export default function DefineOntology(props: Props) {
  const { fetching, initialDefinition, onBack, onNext, onSkip, submitting } =
    props;

  const [definition, setDefinition] = useState<OntologyGraph>(emptyDefinition);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    if (initialDefinition?.entities?.length) {
      setDefinition(initialDefinition);
      setHasGenerated(true);
    }
  }, [initialDefinition]);

  const onResult = useCallback((result: OntologyGraph) => {
    setDefinition({
      entities: (result.entities || []).map((e) => ({
        ...e,
        id: e.id || uuidv4(),
      })),
      relationships: (result.relationships || []).map((r) => ({
        ...r,
        id: r.id || uuidv4(),
      })),
    });
    setHasGenerated(true);
  }, []);

  const {
    generating,
    error: aiError,
    elapsed,
    generate,
  } = useAIOntologyRecommendation(onResult);

  // auto-generate the first time the user reaches the step with no ontology yet
  useEffect(() => {
    if (
      !fetching &&
      !hasGenerated &&
      !generating &&
      !initialDefinition?.entities?.length
    ) {
      generate();
      setHasGenerated(true);
    }
  }, [fetching, hasGenerated, generating, initialDefinition, generate]);

  const updateEntity = (id: string, patch: Partial<OntologyEntity>) => {
    setDefinition((prev) => ({
      ...prev,
      entities: prev.entities.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    }));
  };

  const updateAttributeDescription = (
    entityId: string,
    attrName: string,
    description: string,
  ) => {
    setDefinition((prev) => ({
      ...prev,
      entities: prev.entities.map((e) =>
        e.id === entityId
          ? {
              ...e,
              attributes: (e.attributes || []).map((a) =>
                a.name === attrName ? { ...a, description } : a,
              ),
            }
          : e,
      ),
    }));
  };

  const updateRelationship = (
    id: string,
    patch: Partial<OntologyRelationship>,
  ) => {
    setDefinition((prev) => ({
      ...prev,
      relationships: prev.relationships.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    }));
  };

  const deleteRelationship = (id: string) => {
    setDefinition((prev) => ({
      ...prev,
      relationships: prev.relationships.filter((r) => r.id !== id),
    }));
  };

  const addRelationship = () => {
    const firstEntity = definition.entities[0]?.name || '';
    const secondEntity =
      definition.entities[1]?.name || definition.entities[0]?.name || '';
    setDefinition((prev) => ({
      ...prev,
      relationships: [
        ...prev.relationships,
        {
          id: uuidv4(),
          name: 'New relationship',
          fromEntity: firstEntity,
          toEntity: secondEntity,
          type: 'MANY_TO_ONE',
          description: '',
        },
      ],
    }));
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

  const submit = () => {
    onNext && onNext({ definition });
  };

  const isLoading = fetching || generating;
  const isEmpty = definition.entities.length === 0;

  return (
    <div>
      <Title level={1} className="mb-3">
        Define ontology
      </Title>
      <Text>
        The ontology is a business semantic layer on top of your tables. Each
        table becomes an entity with a semantic name, and relationships are
        described in business terms. AI generates a first draft that you can
        edit before saving.
      </Text>

      <div className="mt-4">
        <Space align="center">
          <Button
            icon={<BulbOutlined />}
            loading={generating}
            onClick={generate}
            disabled={isLoading}
          >
            Regenerate with AI
          </Button>
          {generating && (
            <Text type="secondary">
              AI is analyzing your schema to build the ontology
              {elapsed > 0 ? ` (${elapsed}s)` : ''}...
            </Text>
          )}
        </Space>
      </div>

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

      <Spin spinning={isLoading} tip="Loading...">
        {!isEmpty && (
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
                          updateEntity(entity.id, {
                            displayName: e.target.value,
                          })
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
                        updateEntity(entity.id, {
                          description: e.target.value,
                        })
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
        )}
      </Spin>

      <Row gutter={16} className="pt-6">
        <Col span={12}>
          <Button onClick={onBack} size="large" className="adm-onboarding-btn">
            Back
          </Button>
        </Col>
        <Col className="text-right" span={12}>
          <Button
            className="mr-4 gray-7 adm-onboarding-btn"
            type="text"
            size="large"
            onClick={onSkip}
            disabled={submitting}
          >
            Skip this step
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={submit}
            className="adm-onboarding-btn"
            loading={submitting}
            disabled={isLoading || isEmpty}
          >
            Finish
          </Button>
        </Col>
      </Row>
    </div>
  );
}
