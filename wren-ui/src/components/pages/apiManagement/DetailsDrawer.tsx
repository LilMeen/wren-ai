import { Drawer, Typography, Row, Col, Tag } from 'antd';
import { getAbsoluteTime } from '@/utils/time';
import { DrawerAction } from '@/hooks/useDrawerAction';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import JsonCodeBlock from '@/components/code/JsonCodeBlock';
import { ApiHistoryResponse } from '@/apollo/client/graphql/__types__';

type Props = DrawerAction<ApiHistoryResponse> & {
  loading?: boolean;
};

export default function DetailsDrawer(props: Props) {
  const { visible, onClose, defaultValue } = props;

  const {
    id,
    projectId,
    threadId,
    userId,
    userEmail,
    apiType,
    createdAt,
    updatedAt,
    durationMs,
    statusCode,
    headers,
    requestPayload,
    responsePayload,
  } = defaultValue || {};

  const getStatusTag = (status: number) => {
    const isSuccess = status >= 200 && status < 300;
    return (
      <Tag
        icon={isSuccess ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        color={isSuccess ? 'success' : 'error'}
      >
        {status}
      </Tag>
    );
  };

  return (
    <Drawer
      visible={visible}
      className="gray-8"
      title="API details"
      width={760}
      closable
      destroyOnClose
      onClose={onClose}
      footer={null}
    >
      <Row className="mb-6">
        <Col span={12}>
          <Typography.Text className="d-block gray-7 mb-2">
            Record ID
          </Typography.Text>
          <Typography.Text code copyable className="gray-8">
            {id || '-'}
          </Typography.Text>
        </Col>
        <Col span={12}>
          <Typography.Text className="d-block gray-7 mb-2">
            Project ID
          </Typography.Text>
          <div>{projectId ?? '-'}</div>
        </Col>
      </Row>
      <Row className="mb-6">
        <Col span={12}>
          <Typography.Text className="d-block gray-7 mb-2">
            API type
          </Typography.Text>
          <div>
            <Tag className="gray-8">{apiType?.toLowerCase()}</Tag>
          </div>
        </Col>
        <Col span={12}>
          <Typography.Text className="d-block gray-7 mb-2">
            Status code
          </Typography.Text>
          <div>{statusCode ? getStatusTag(statusCode) : '-'}</div>
        </Col>
      </Row>
      <Row className="mb-6">
        <Col span={12}>
          <Typography.Text className="d-block gray-7 mb-2">
            User
          </Typography.Text>
          <div>{userEmail || '-'}</div>
        </Col>
        <Col span={12}>
          <Typography.Text className="d-block gray-7 mb-2">
            User ID
          </Typography.Text>
          <div>{userId ?? '-'}</div>
        </Col>
      </Row>
      <Row className="mb-6">
        <Col span={24}>
          <Typography.Text className="d-block gray-7 mb-2">
            Thread ID
          </Typography.Text>
          <Typography.Text code copyable={!!threadId} className="gray-8">
            {threadId || '-'}
          </Typography.Text>
        </Col>
      </Row>
      <Row className="mb-6">
        <Col span={12}>
          <Typography.Text className="d-block gray-7 mb-2">
            Created at
          </Typography.Text>
          <div>{getAbsoluteTime(createdAt)}</div>
        </Col>
        <Col span={12}>
          <Typography.Text className="d-block gray-7 mb-2">
            Updated at
          </Typography.Text>
          <div>{getAbsoluteTime(updatedAt)}</div>
        </Col>
      </Row>
      <Row className="mb-6">
        <Col span={12}>
          <Typography.Text className="d-block gray-7 mb-2">
            Duration
          </Typography.Text>
          <div>{durationMs != null ? `${durationMs} ms` : '-'}</div>
        </Col>
      </Row>

      <div className="mb-6">
        <Typography.Text className="d-block gray-7 mb-2">
          Headers
        </Typography.Text>
        <JsonCodeBlock
          code={headers}
          backgroundColor="var(--gray-2)"
          maxHeight="400"
          copyable
        />
      </div>

      <div className="mb-6">
        <Typography.Text className="d-block gray-7 mb-2">
          Request payload
        </Typography.Text>
        <JsonCodeBlock
          code={requestPayload}
          backgroundColor="var(--gray-2)"
          maxHeight="400"
          copyable
        />
      </div>

      <div className="mb-6">
        <Typography.Text className="d-block gray-7 mb-2">
          Response payload
        </Typography.Text>
        <JsonCodeBlock
          code={responsePayload}
          backgroundColor="var(--gray-2)"
          maxHeight="400"
          copyable
        />
      </div>
    </Drawer>
  );
}
