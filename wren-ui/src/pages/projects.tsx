import { useQuery } from '@apollo/client';
import { Button, Card, Empty, List, Space, Spin, Typography } from 'antd';
import { useRouter } from 'next/router';
import HeaderBar from '@/components/HeaderBar';
import PageLayout from '@/components/layouts/PageLayout';
import { CURRENT_USER } from '@/apollo/client/graphql/auth';
import { PROJECTS } from '@/apollo/client/graphql/project';
import { Path } from '@/utils/enum';

export default function Projects() {
  const router = useRouter();
  const isServer = typeof window === 'undefined';
  const { data: userData } = useQuery(CURRENT_USER, { skip: isServer });
  const { data, loading, refetch } = useQuery(PROJECTS, {
    fetchPolicy: 'cache-and-network',
    skip: isServer,
  });
  const currentUser = userData?.currentUser;
  const canCreateProject = ['dev', 'admin'].includes(currentUser?.role);
  const projects = data?.projects || [];

  const selectProject = (projectId: number) => {
    window.localStorage.setItem('wren:selectedProjectId', String(projectId));
    router.push(Path.Home);
  };

  const addProject = () => {
    window.localStorage.removeItem('wren:selectedProjectId');
    router.push(Path.OnboardingConnection);
  };

  return (
    <>
      <HeaderBar />
      <PageLayout
        title="Select project"
        description="Choose a project before chatting."
        titleExtra={
          canCreateProject ? (
            <Button type="primary" onClick={addProject}>
              Add new project
            </Button>
          ) : null
        }
      >
        {loading && !projects.length ? (
          <div className="d-flex justify-center py-12">
            <Spin />
          </div>
        ) : projects.length ? (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
            dataSource={projects}
            renderItem={(project: any) => (
              <List.Item>
                <Card
                  hoverable
                  title={project.displayName}
                  onClick={() => selectProject(project.id)}
                >
                  <Typography.Paragraph type="secondary">
                    {project.description || 'No description'}
                  </Typography.Paragraph>
                  <Space direction="vertical" size={4}>
                    <Typography.Text type="secondary">
                      Created by: {project.owner?.email || 'Unknown'}
                    </Typography.Text>
                    <Button type="link" className="px-0">
                      Open project
                    </Button>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No projects yet">
            {canCreateProject && (
              <Button type="primary" onClick={addProject}>
                Add new project
              </Button>
            )}
            {!canCreateProject && (
              <Button onClick={() => refetch()}>Refresh</Button>
            )}
          </Empty>
        )}
      </PageLayout>
    </>
  );
}
