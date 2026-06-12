import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Button, Card, Empty, Spin, Tag, Typography, message } from 'antd';
import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import LogoutOutlined from '@ant-design/icons/LogoutOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import styled from 'styled-components';
import useAuth from '@/hooks/useAuth';
import { Path } from '@/utils/enum';

const { Text } = Typography;

interface ProjectItem {
  id: number;
  displayName: string;
  type: string;
  sampleDataset: string | null;
  ownerEmail: string | null;
  isOwner: boolean;
  updatedAt: string;
}

const Wrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, var(--gray-10) 0%, #1f1f48 100%);
  padding: 24px;
`;

const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 0 32px;
`;

const ProjectCard = styled(Card)`
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  }
`;

export default function Projects() {
  const router = useRouter();
  const { user, isDev, signOut } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) return;
        const data = await response.json();
        setProjects(data.projects || []);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const onSelectProject = async (project: ProjectItem) => {
    setSelectingId(project.id);
    try {
      const response = await fetch('/api/projects/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (!response.ok) {
        const data = await response.json();
        message.error(data.error || 'Failed to select project.');
        return;
      }
      router.push(Path.Home);
    } catch {
      message.error('Failed to select project.');
    } finally {
      setSelectingId(null);
    }
  };

  const onCreateProject = () => {
    router.push(`${Path.OnboardingConnection}?create=true`);
  };

  return (
    <Wrapper>
      <Container>
        <HeaderRow>
          <Image
            src="/images/logo-white-with-text.svg"
            alt="Wren AI"
            width={125}
            height={30}
          />
          <div className="d-flex align-center" style={{ gap: 12 }}>
            {user && (
              <Text style={{ color: 'var(--gray-5)' }}>
                {user.email} <Tag color="geekblue">{user.role}</Tag>
              </Text>
            )}
            <Button
              ghost
              size="small"
              icon={<LogoutOutlined />}
              onClick={signOut}
            >
              Sign out
            </Button>
          </div>
        </HeaderRow>

        <div
          className="d-flex align-center justify-space-between"
          style={{ marginBottom: 16 }}
        >
          <Text style={{ color: 'var(--gray-1)', fontSize: 18, fontWeight: 700 }}>
            Select a project
          </Text>
          {isDev && !loading && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreateProject}>
              New project
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12" style={{ padding: '48px 0' }}>
            <Spin />
          </div>
        ) : projects.length === 0 ? (
          <Card style={{ borderRadius: 8 }}>
            <Empty
              description={
                isDev
                  ? 'No projects yet. Set up your first project to get started.'
                  : 'No projects available yet. Ask a developer to create one.'
              }
            >
              {isDev && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={onCreateProject}
                >
                  Set up a project
                </Button>
              )}
            </Empty>
          </Card>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              onClick={() => onSelectProject(project)}
            >
              <div className="d-flex align-center justify-space-between">
                <div className="d-flex align-center" style={{ gap: 12 }}>
                  <DatabaseOutlined
                    style={{ fontSize: 24, color: 'var(--geekblue-6)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {project.displayName}
                      {project.isOwner && (
                        <Tag color="green" style={{ marginLeft: 8 }}>
                          your project
                        </Tag>
                      )}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {project.type}
                      {project.sampleDataset
                        ? ` · sample dataset: ${project.sampleDataset}`
                        : ''}
                      {project.ownerEmail
                        ? ` · owned by ${project.ownerEmail}`
                        : ''}
                    </Text>
                  </div>
                </div>
                <Button
                  type="primary"
                  loading={selectingId === project.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectProject(project);
                  }}
                >
                  Open
                </Button>
              </div>
            </ProjectCard>
          ))
        )}
      </Container>
    </Wrapper>
  );
}
