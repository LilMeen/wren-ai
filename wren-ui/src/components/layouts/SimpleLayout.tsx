import { Layout } from 'antd';
import HeaderBar from '@/components/HeaderBar';
import PageLoading from '@/components/PageLoading';
import clsx from 'clsx';

const { Content } = Layout;

interface Props {
  children: React.ReactNode;
  loading?: boolean;
}

export default function SimpleLayout(props: Props) {
  const { children, loading } = props;
  return (
    <Layout
      className={clsx('adm-main bg-gray-3', {
        'overflow-hidden': loading,
      })}
    >
      <HeaderBar />
      <Content className="adm-content">{children}</Content>
      <PageLoading visible={loading} />
    </Layout>
  );
}
