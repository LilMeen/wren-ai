import Link from 'next/link';
import { ComponentProps, useMemo, useState } from 'react';
import { Typography, Row, Col } from 'antd';
import { useQuery } from '@apollo/client';
import { getDataSources, getTemplates, ButtonOption } from './utils';
import { makeIterable } from '@/utils/iteration';
import ButtonItem from './ButtonItem';
import {
  DataSourceName,
  SampleDatasetName,
} from '@/apollo/client/graphql/__types__';
import { LIST_OPEN_METADATA_SERVICES } from '@/apollo/client/graphql/openMetadata';

const ButtonTemplate = (props: ComponentProps<typeof ButtonItem>) => {
  return (
    <Col span={6} key={props.label}>
      <ButtonItem {...props} />
    </Col>
  );
};

const DataSourceIterator = makeIterable(ButtonTemplate);
const ContextLayerIterator = makeIterable(ButtonTemplate);
const TemplatesIterator = makeIterable(ButtonTemplate);

const omContextLayers: ButtonOption[] = [
  {
    value: 'openmetadata',
    label: 'OpenMetadata',
    logo: '/images/dataSource/openmetadata.svg',
  },
];

export default function Starter(props) {
  const { onNext, submitting } = props;

  const [template, setTemplate] = useState<SampleDatasetName>();

  const dataSources = getDataSources();
  const templates = getTemplates();

  // Silently check whether OpenMetadata services are configured. The section
  // is only shown when at least one service is available.
  const { data: omData } = useQuery(LIST_OPEN_METADATA_SERVICES, {
    fetchPolicy: 'cache-first',
    onError: () => {},
  });
  const omAvailable = useMemo(
    () => (omData?.listOpenMetadataServices?.length ?? 0) > 0,
    [omData],
  );

  const onSelectDataSource = (value: DataSourceName) => {
    onNext && onNext({ dataSource: value });
  };

  const onSelectContextLayer = () => {
    onNext && onNext({ contextLayer: true });
  };

  const onSelectTemplate = (value: string) => {
    setTemplate(value as SampleDatasetName);
    onNext && onNext({ template: value });
  };

  return (
    <>
      <Typography.Title level={1} className="mb-3">
        Connect a data source
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
      <Row className="mt-6" gutter={[16, 16]}>
        <DataSourceIterator
          data={dataSources}
          onSelect={onSelectDataSource}
          submitting={submitting}
        />
      </Row>

      {omAvailable && (
        <>
          <div className="py-8" />
          <Typography.Title level={1} className="mb-3">
            Connect a centralized context layer
          </Typography.Title>
          <Typography.Text>
            Use OpenMetadata as your context source. WrenAI will import
            connection details, table/column descriptions, and business glossary
            terms automatically.
          </Typography.Text>
          <Row className="mt-6" gutter={[16, 16]}>
            <ContextLayerIterator
              data={omContextLayers}
              onSelect={() => onSelectContextLayer()}
              submitting={submitting}
            />
          </Row>
        </>
      )}

      <div className="py-8" />

      <Typography.Title level={1} className="mb-3">
        Play around with sample data
      </Typography.Title>
      <Row className="mt-6" gutter={[16, 16]}>
        <TemplatesIterator
          data={templates}
          onSelect={onSelectTemplate}
          submitting={submitting}
          selectedTemplate={template}
        />
      </Row>

      <div className="py-12" />
    </>
  );
}
