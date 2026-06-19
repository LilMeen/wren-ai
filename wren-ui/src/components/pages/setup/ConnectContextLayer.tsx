import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Collapse,
  Form,
  Row,
  Select,
  Typography,
} from 'antd';
import styled from 'styled-components';
import { useQuery } from '@apollo/client';
import { DATA_SOURCES } from '@/utils/enum/dataSources';
import { DataSourceName } from '@/apollo/client/graphql/__types__';
import {
  LIST_OPEN_METADATA_SERVICES,
  LIST_OPEN_METADATA_GLOSSARIES,
} from '@/apollo/client/graphql/openMetadata';
import { getDataSource } from './utils';
import { ContextLayerStepData } from '@/hooks/useSetupConnectionContextLayer';

const StyledForm = styled(Form)`
  border: 1px var(--gray-4) solid;
  border-radius: 4px;
`;

// Map OpenMetadata serviceType strings → WrenAI DATA_SOURCES enum values.
const OM_SERVICE_TYPE_MAP: Record<string, DATA_SOURCES> = {
  Mysql: DATA_SOURCES.MYSQL,
  Postgres: DATA_SOURCES.POSTGRES,
  BigQuery: DATA_SOURCES.BIG_QUERY,
  Snowflake: DATA_SOURCES.SNOWFLAKE,
  Mssql: DATA_SOURCES.MSSQL,
  Trino: DATA_SOURCES.TRINO,
  Redshift: DATA_SOURCES.REDSHIFT,
  Databricks: DATA_SOURCES.DATABRICKS,
  Athena: DATA_SOURCES.ATHENA,
  ClickHouse: DATA_SOURCES.CLICK_HOUSE,
};

const parseHostPort = (hostPort?: string): { host?: string; port?: string } => {
  if (!hostPort) return {};
  const lastColon = hostPort.lastIndexOf(':');
  if (lastColon === -1) return { host: hostPort };
  return {
    host: hostPort.slice(0, lastColon),
    port: hostPort.slice(lastColon + 1),
  };
};

interface OMService {
  name: string;
  serviceType: string;
  description?: string;
  hostPort?: string;
  username?: string;
}

interface OMGlossary {
  name: string;
  displayName?: string;
  description?: string;
}

interface Props {
  onNext: (data: ContextLayerStepData) => void;
  onBack: () => void;
  submitting: boolean;
  connectError?: Record<string, any>;
}

export default function ConnectContextLayer(props: Props) {
  const { onBack, onNext, submitting, connectError } = props;
  const [form] = Form.useForm();

  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(
    null,
  );
  const [selectedGlossaries, setSelectedGlossaries] = useState<string[]>([]);
  const [resolvedDataSourceType, setResolvedDataSourceType] =
    useState<DATA_SOURCES | null>(null);
  const [unsupportedServiceType, setUnsupportedServiceType] = useState<
    string | null
  >(null);

  const { data: omData } = useQuery(LIST_OPEN_METADATA_SERVICES, {
    fetchPolicy: 'cache-first',
    onError: () => {},
  });
  const omServices: OMService[] = useMemo(
    () => omData?.listOpenMetadataServices || [],
    [omData],
  );

  const { data: glossaryData } = useQuery(LIST_OPEN_METADATA_GLOSSARIES, {
    fetchPolicy: 'cache-first',
    onError: () => {},
  });
  const omGlossaries: OMGlossary[] = useMemo(
    () => glossaryData?.listOpenMetadataGlossaries || [],
    [glossaryData],
  );

  const onSelectService = (serviceName: string) => {
    setSelectedServiceName(serviceName);
    const service = omServices.find((s) => s.name === serviceName);
    if (!service) return;

    const mapped = OM_SERVICE_TYPE_MAP[service.serviceType] ?? null;
    setResolvedDataSourceType(mapped);
    setUnsupportedServiceType(mapped ? null : service.serviceType);

    if (mapped) {
      const { host, port } = parseHostPort(service.hostPort);
      form.setFieldsValue({
        host,
        port: port ? Number(port) : undefined,
        user: service.username,
        username: service.username,
      });
    }
  };

  const currentDataSource = resolvedDataSourceType
    ? getDataSource(resolvedDataSourceType)
    : null;

  const submit = () => {
    if (!selectedServiceName || !resolvedDataSourceType) return;
    form
      .validateFields()
      .then((values) => {
        onNext({
          omServiceName: selectedServiceName,
          omGlossaryNames: selectedGlossaries,
          properties: values,
          // DATA_SOURCES and DataSourceName share identical string values
          dataSourceType: resolvedDataSourceType as unknown as DataSourceName,
        });
      })
      .catch((err) => console.error(err));
  };

  return (
    <>
      <Typography.Title level={1} className="mb-3">
        Connect a centralized context layer
      </Typography.Title>
      <Typography.Text>
        Select an OpenMetadata service. WrenAI will use its connection details
        and import table/column descriptions automatically.
      </Typography.Text>

      <div className="my-6">
        <Typography.Text strong className="d-block mb-2">
          OpenMetadata service
        </Typography.Text>
        <Select
          style={{ width: '100%' }}
          placeholder="Select a service"
          onChange={onSelectService}
          options={omServices.map((service) => ({
            label: `${service.name} (${service.serviceType})`,
            value: service.name,
          }))}
        />
        {unsupportedServiceType && (
          <Alert
            className="mt-3"
            type="warning"
            showIcon
            message={`Service type "${unsupportedServiceType}" is not yet supported by WrenAI.`}
          />
        )}
      </div>

      {currentDataSource && (
        <StyledForm form={form} layout="vertical" className="p-6 mb-6">
          <Typography.Text type="secondary" className="d-block mb-4">
            Connection details have been pre-filled from OpenMetadata. Enter the
            password and verify any remaining fields.
          </Typography.Text>
          <currentDataSource.component />
        </StyledForm>
      )}

      {omGlossaries.length > 0 && (
        <Collapse ghost className="mb-3">
          <Collapse.Panel
            header="Import business glossary as AI instructions (optional)"
            key="glossary"
          >
            <Typography.Text type="secondary" className="d-block mb-2">
              Selected glossaries will be imported as Instructions to improve AI
              SQL generation.
            </Typography.Text>
            <Checkbox.Group
              value={selectedGlossaries}
              onChange={(vals) => setSelectedGlossaries(vals as string[])}
              options={omGlossaries.map((g) => ({
                label: g.displayName || g.name,
                value: g.name,
              }))}
            />
          </Collapse.Panel>
        </Collapse>
      )}

      {connectError && (
        <Alert
          message={connectError.shortMessage}
          description={connectError.message}
          type="error"
          showIcon
          className="my-6"
        />
      )}

      <Row gutter={16} className="pt-6">
        <Col span={12}>
          <Button
            onClick={onBack}
            size="large"
            className="adm-onboarding-btn"
            disabled={submitting}
          >
            Back
          </Button>
        </Col>
        <Col className="text-right" span={12}>
          <Button
            type="primary"
            size="large"
            onClick={submit}
            loading={submitting}
            disabled={!selectedServiceName || !resolvedDataSourceType}
            className="adm-onboarding-btn"
          >
            Next
          </Button>
        </Col>
      </Row>
    </>
  );
}
