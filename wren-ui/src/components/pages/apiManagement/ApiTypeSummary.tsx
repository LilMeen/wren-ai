import { Typography, Tag, Space } from 'antd';
import { ApiHistoryResponse, ApiType } from '@/apollo/client/graphql/__types__';

type Props = {
  record: ApiHistoryResponse;
};

const { Text } = Typography;

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text className="d-block gray-7 mb-1" style={{ fontSize: 12 }}>
    {children}
  </Text>
);

const Field = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="mb-4">
      <Label>{label}</Label>
      <div>{value}</div>
    </div>
  );
};

const SqlBlock = ({ sql }: { sql: string }) => (
  <pre
    style={{
      background: 'var(--gray-2)',
      padding: '8px 12px',
      borderRadius: 4,
      fontSize: 12,
      overflowX: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      margin: 0,
    }}
  >
    {sql}
  </pre>
);

const TableChips = ({ tables }: { tables: string[] }) => (
  <Space wrap size={4}>
    {tables.map((t) => (
      <Tag key={t}>{t}</Tag>
    ))}
  </Space>
);

const TextPreview = ({
  text,
  maxChars = 400,
}: {
  text: string;
  maxChars?: number;
}) => (
  <Text style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
    {text.length > maxChars ? text.slice(0, maxChars) + '…' : text}
  </Text>
);

// ── SQL Generation group ────────────────────────────────────────────────────
const SqlGenerationSummary = ({ req, res }: { req: any; res: any }) => {
  const sql =
    res?.sql ||
    res?.candidates?.[0]?.sql ||
    res?.candidates?.[0]?.type === 'SQL'
      ? res?.candidates?.[0]?.sql
      : null;
  const candidateCount = res?.candidates?.length;
  const tables: string[] = res?.retrievedTables ?? [];

  return (
    <>
      {req?.question && <Field label="Question" value={req.question} />}
      {res?.rephrasedQuestion && (
        <Field label="Rephrased Question" value={res.rephrasedQuestion} />
      )}
      {sql && <Field label="SQL" value={<SqlBlock sql={sql} />} />}
      {candidateCount !== undefined && (
        <Field label="Candidates" value={`${candidateCount} generated`} />
      )}
      {res?.intentReasoning && (
        <Field label="Intent Reasoning" value={res.intentReasoning} />
      )}
      {res?.sqlGenerationReasoning && (
        <Field
          label="SQL Generation Reasoning"
          value={res.sqlGenerationReasoning}
        />
      )}
      {tables.length > 0 && (
        <Field label="Retrieved Tables" value={<TableChips tables={tables} />} />
      )}
      {res?.traceId && (
        <Field
          label="Trace ID"
          value={<Text code copyable>{res.traceId}</Text>}
        />
      )}
      {req?.taskId && (
        <Field
          label="Task ID"
          value={<Text code copyable>{req.taskId}</Text>}
        />
      )}
    </>
  );
};

// ── Thread group ────────────────────────────────────────────────────────────
const ThreadSummary = ({ req, res }: { req: any; res: any }) => (
  <>
    {req?.question && <Field label="Question" value={req.question} />}
    {res?.sql && <Field label="SQL" value={<SqlBlock sql={res.sql} />} />}
    {res?.responseId !== undefined && (
      <Field label="Response ID" value={String(res.responseId)} />
    )}
  </>
);

// ── Data execution group ────────────────────────────────────────────────────
const DataSummary = ({ req, res }: { req: any; res: any }) => {
  const columns: string[] = res?.columns ?? [];
  return (
    <>
      {req?.sql && <Field label="SQL" value={<SqlBlock sql={req.sql} />} />}
      {(res?.totalRows !== undefined || res?.rowCount !== undefined) && (
        <Field
          label="Total Rows"
          value={String(res?.totalRows ?? res?.rowCount)}
        />
      )}
      {columns.length > 0 && (
        <Field
          label="Columns"
          value={<TableChips tables={columns} />}
        />
      )}
    </>
  );
};

// ── Adjustment group ────────────────────────────────────────────────────────
const AdjustmentSummary = ({ req, res }: { req: any; res: any }) => (
  <>
    {req?.sql_before && (
      <Field label="SQL Before" value={<SqlBlock sql={req.sql_before} />} />
    )}
    {(req?.sql_new || res?.sql) && (
      <Field
        label="SQL After"
        value={<SqlBlock sql={req?.sql_new || res?.sql} />}
      />
    )}
    {res?.status && (
      <Field
        label="Status"
        value={
          <Tag color={res.status === 'FINISHED' ? 'success' : 'error'}>
            {res.status}
          </Tag>
        }
      />
    )}
    {res?.invalidSql && (
      <Field label="Invalid SQL" value={<SqlBlock sql={res.invalidSql} />} />
    )}
    {res?.error && (
      <Field
        label="Error"
        value={
          <Text type="danger">
            {typeof res.error === 'string'
              ? res.error
              : res.error?.message || JSON.stringify(res.error)}
          </Text>
        }
      />
    )}
    {res?.traceId && (
      <Field
        label="Trace ID"
        value={<Text code copyable>{res.traceId}</Text>}
      />
    )}
  </>
);

// ── Content group ────────────────────────────────────────────────────────────
const ContentSummary = ({ req, res }: { req: any; res: any }) => {
  const content = res?.content || res?.summary;
  const steps: any[] = res?.steps ?? [];
  return (
    <>
      {res?.status && (
        <Field
          label="Status"
          value={
            <Tag color={res.status === 'SUCCEEDED' ? 'success' : 'default'}>
              {res.status}
            </Tag>
          }
        />
      )}
      {steps.length > 0 && (
        <Field label="Steps" value={`${steps.length} breakdown steps`} />
      )}
      {res?.numRowsUsedInLLM !== undefined && (
        <Field label="Rows used in LLM" value={String(res.numRowsUsedInLLM)} />
      )}
      {content && (
        <Field label="Content" value={<TextPreview text={content} />} />
      )}
    </>
  );
};

// ── Visualization group ──────────────────────────────────────────────────────
const VizSummary = ({ res }: { res: any }) => {
  const spec = res?.vegaSpec;
  const chartType = spec?.mark?.type || spec?.mark || spec?.layer ? 'layered' : null;
  const encodingFields = spec?.encoding
    ? Object.entries(spec.encoding)
        .map(([channel, def]: [string, any]) => def?.field ? `${channel}: ${def.field}` : null)
        .filter(Boolean)
    : [];

  return (
    <>
      {chartType && <Field label="Chart Type" value={chartType} />}
      {encodingFields.length > 0 && (
        <Field
          label="Encoding"
          value={
            <Space wrap size={4}>
              {encodingFields.map((f) => (
                <Tag key={f}>{f}</Tag>
              ))}
            </Space>
          }
        />
      )}
    </>
  );
};

// ── Knowledge group ──────────────────────────────────────────────────────────
const KnowledgeSummary = ({
  apiType,
  req,
  res,
}: {
  apiType: ApiType;
  req: any;
  res: any;
}) => {
  const instruction = res?.instruction || req?.instruction;
  const questions: string[] = res?.questions || req?.questions || [];
  const sql = res?.sql || req?.sql;
  const question = res?.question || req?.question;
  const isGlobal = res?.isGlobal ?? req?.isGlobal;
  const items: any[] = res ?? [];

  if (
    apiType === ApiType.GET_INSTRUCTIONS &&
    Array.isArray(res) &&
    res.length >= 0
  ) {
    return <Field label="Count" value={`${res.length} instructions`} />;
  }
  if (
    apiType === ApiType.GET_SQL_PAIRS &&
    Array.isArray(res) &&
    res.length >= 0
  ) {
    return <Field label="Count" value={`${res.length} SQL pairs`} />;
  }
  if (apiType === ApiType.DELETE_INSTRUCTION || apiType === ApiType.DELETE_SQL_PAIR) {
    const id = req?.id;
    return <Field label="Deleted ID" value={id ? String(id) : '-'} />;
  }

  return (
    <>
      {instruction && <Field label="Instruction" value={instruction} />}
      {isGlobal !== undefined && (
        <Field
          label="Global"
          value={
            <Tag color={isGlobal ? 'blue' : 'default'}>
              {isGlobal ? 'Global' : 'Specific'}
            </Tag>
          }
        />
      )}
      {questions.length > 0 && (
        <Field
          label="Questions"
          value={
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {questions.map((q, i) => (
                <li key={i} style={{ fontSize: 13 }}>
                  {q}
                </li>
              ))}
            </ul>
          }
        />
      )}
      {sql && <Field label="SQL" value={<SqlBlock sql={sql} />} />}
      {question && <Field label="Question" value={question} />}
    </>
  );
};

// ── Model group ──────────────────────────────────────────────────────────────
const ModelSummary = ({ res }: { res: any }) => (
  <>
    {res?.models !== undefined && (
      <Field label="Models" value={`${res.models?.length ?? 0} models`} />
    )}
    {res?.relationships !== undefined && (
      <Field
        label="Relationships"
        value={`${res.relationships?.length ?? 0} relationships`}
      />
    )}
  </>
);

// ── Main component ───────────────────────────────────────────────────────────
export default function ApiTypeSummary({ record }: Props) {
  const { apiType, requestPayload: req, responsePayload: res } = record;

  const SQL_GENERATION_TYPES = [
    ApiType.CHAT_ASK,
    ApiType.CHAT_TASK_RESULT,
    ApiType.STREAM_ASK,
    ApiType.STREAM_GENERATE_SQL,
    ApiType.GENERATE_SQL,
    ApiType.ASK,
  ];

  const THREAD_TYPES = [ApiType.CHAT_CREATE_THREAD, ApiType.CHAT_THREAD_RESPONSE];

  const DATA_TYPES = [ApiType.CHAT_PREVIEW_DATA, ApiType.RUN_SQL];

  const ADJUSTMENT_TYPES = [
    ApiType.CHAT_ADJUST,
    ApiType.CHAT_ADJUSTMENT_RESULT,
  ];

  const CONTENT_TYPES = [
    ApiType.CHAT_BREAKDOWN,
    ApiType.CHAT_ANSWER,
    ApiType.GENERATE_SUMMARY,
  ];

  const KNOWLEDGE_TYPES = [
    ApiType.GET_INSTRUCTIONS,
    ApiType.CREATE_INSTRUCTION,
    ApiType.UPDATE_INSTRUCTION,
    ApiType.DELETE_INSTRUCTION,
    ApiType.GET_SQL_PAIRS,
    ApiType.CREATE_SQL_PAIR,
    ApiType.UPDATE_SQL_PAIR,
    ApiType.DELETE_SQL_PAIR,
  ];

  let content: React.ReactNode = null;

  if (SQL_GENERATION_TYPES.includes(apiType)) {
    content = <SqlGenerationSummary req={req} res={res} />;
  } else if (THREAD_TYPES.includes(apiType)) {
    content = <ThreadSummary req={req} res={res} />;
  } else if (DATA_TYPES.includes(apiType)) {
    content = <DataSummary req={req} res={res} />;
  } else if (ADJUSTMENT_TYPES.includes(apiType)) {
    content = <AdjustmentSummary req={req} res={res} />;
  } else if (CONTENT_TYPES.includes(apiType)) {
    content = <ContentSummary req={req} res={res} />;
  } else if (apiType === ApiType.GENERATE_VEGA_CHART) {
    content = <VizSummary res={res} />;
  } else if (KNOWLEDGE_TYPES.includes(apiType)) {
    content = <KnowledgeSummary apiType={apiType} req={req} res={res} />;
  } else if (apiType === ApiType.GET_MODELS) {
    content = <ModelSummary res={res} />;
  }

  if (!content) return null;

  return (
    <div className="mb-6">
      <Typography.Text
        className="d-block gray-7 mb-3"
        style={{ fontWeight: 600, fontSize: 13 }}
      >
        Key Info
      </Typography.Text>
      <div
        style={{
          background: 'var(--gray-2)',
          borderRadius: 6,
          padding: '12px 16px',
        }}
      >
        {content}
      </div>
    </div>
  );
}
