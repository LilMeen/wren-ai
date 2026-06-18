import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Alert, Typography, Form, Row, Col, Button, Radio, Select } from 'antd';
import styled from 'styled-components';
import { useQuery } from '@apollo/client';
import { DATA_SOURCES } from '@/utils/enum/dataSources';
import { LIST_OPEN_METADATA_SERVICES } from '@/apollo/client/graphql/openMetadata';
import { getDataSource, getPostgresErrorMessage } from './utils';

const StyledForm = styled(Form)`
  border: 1px var(--gray-4) solid;
  border-radius: 4px;
`;

const DataSource = styled.div`
  border: 1px var(--gray-4) solid;
  border-radius: 4px;
`;

interface Props {
  dataSource: DATA_SOURCES;
  onNext: (data: any) => void;
  onBack: () => void;
  submitting: boolean;
  connectError?: Record<string, any>;
}

interface OMService {
  name: string;
  serviceType: string;
  description?: string;
  hostPort?: string;
  username?: string;
}

enum ImportMode {
  MANUAL = 'manual',
  OPEN_METADATA = 'openmetadata',
}

// OpenMetadata exposes a service's host:port as a single string; split it into
// the host/port fields the connection forms expect.
const parseHostPort = (hostPort?: string): { host?: string; port?: string } => {
  if (!hostPort) return {};
  const lastColon = hostPort.lastIndexOf(':');
  if (lastColon === -1) return { host: hostPort };
  return {
    host: hostPort.slice(0, lastColon),
    port: hostPort.slice(lastColon + 1),
  };
};

export default function ConnectDataSource(props: Props) {
  const { connectError, dataSource, submitting, onNext, onBack } = props;
  const [form] = Form.useForm();
  const current = getDataSource(dataSource);

  const [importMode, setImportMode] = useState<ImportMode>(ImportMode.MANUAL);

  // OpenMetadata is only offered when the server has it configured: the query
  // returns an empty list when env vars are unset, so the toggle stays hidden.
  const { data: omData } = useQuery(LIST_OPEN_METADATA_SERVICES, {
    fetchPolicy: 'cache-first',
    onError: () => {},
  });
  const omServices: OMService[] = useMemo(
    () => omData?.listOpenMetadataServices || [],
    [omData],
  );
  const omAvailable = omServices.length > 0;

  const onSelectService = (serviceName: string) => {
    const service = omServices.find((s) => s.name === serviceName);
    if (!service) return;
    const { host, port } = parseHostPort(service.hostPort);
    // Pre-fill the shared connection form. Sources use either `user` or
    // `username`; set both so whichever the form registered gets populated.
    form.setFieldsValue({
      host,
      port: port ? Number(port) : undefined,
      user: service.username,
      username: service.username,
    });
  };

  const submit = () => {
    form
      .validateFields()
      .then((values) => {
        onNext && onNext({ properties: values });
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <>
      <Typography.Title level={1} className="mb-3">
        Connect the data source
      </Typography.Title>
      <Typography.Text>
        Vote for your favorite data sources on{' '}
        <Link
          href="https://github.com/Canner/WrenAI/discussions/327"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </Link>
        .
      </Typography.Text>

      <StyledForm form={form} layout="vertical" className="p-6 my-6">
        <Row align="middle" className="mb-6">
          <Col span={12}>
            <DataSource className="d-inline-block px-4 py-2 bg-gray-2 gray-8">
              <Image
                className="mr-2"
                src={current.logo}
                alt={dataSource}
                width="40"
                height="40"
              />
              {current.label}
            </DataSource>
          </Col>
          <Col className="text-right" span={12}>
            Learn more information in the {current.label}{' '}
            <Link
              href={current.guide}
              target="_blank"
              rel="noopener noreferrer"
            >
              setup guide
            </Link>
            .
          </Col>
        </Row>

        {omAvailable && (
          <div className="mb-6">
            <Radio.Group
              value={importMode}
              onChange={(e) => setImportMode(e.target.value)}
            >
              <Radio value={ImportMode.MANUAL}>Manual setup</Radio>
              <Radio value={ImportMode.OPEN_METADATA}>
                Import from OpenMetadata
              </Radio>
            </Radio.Group>

            {importMode === ImportMode.OPEN_METADATA && (
              <div className="mt-4">
                <Typography.Text className="d-block mb-2 gray-7">
                  Select an OpenMetadata service to auto-fill connection
                  details. You still need to enter the password and any
                  remaining fields below.
                </Typography.Text>
                <Select
                  className="mb-3"
                  style={{ width: '100%' }}
                  placeholder="Select a service"
                  onChange={onSelectService}
                  options={omServices.map((service) => ({
                    label: `${service.name} (${service.serviceType})`,
                    value: service.name,
                  }))}
                />
                <Alert
                  type="info"
                  showIcon
                  message="Table and column descriptions from OpenMetadata are imported automatically when the data source is saved."
                />
              </div>
            )}
          </div>
        )}

        <current.component />
      </StyledForm>

      {connectError && (
        <Alert
          message={connectError.shortMessage}
          description={
            dataSource === DATA_SOURCES.POSTGRES
              ? getPostgresErrorMessage(connectError)
              : connectError.message
          }
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
            className="adm-onboarding-btn"
          >
            Next
          </Button>
        </Col>
      </Row>
    </>
  );
}
