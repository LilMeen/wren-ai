import { useRouter } from 'next/router';
import { Button, Dropdown, Layout, Menu, Space, Tag } from 'antd';
import UserOutlined from '@ant-design/icons/UserOutlined';
import LogoutOutlined from '@ant-design/icons/LogoutOutlined';
import SwapOutlined from '@ant-design/icons/SwapOutlined';
import styled from 'styled-components';
import LogoBar from '@/components/LogoBar';
import { Path } from '@/utils/enum';
import Deploy from '@/components/deploy/Deploy';
import useAuth from '@/hooks/useAuth';

const { Header } = Layout;

const StyledButton = styled(Button)<{ $isHighlight: boolean }>`
  background: ${(props) =>
    props.$isHighlight ? 'rgba(255, 255, 255, 0.20)' : 'transparent'};
  font-weight: ${(props) => (props.$isHighlight ? '700' : 'normal')};
  border: none;
  color: var(--gray-1);

  &:hover,
  &:focus {
    background: ${(props) =>
      props.$isHighlight
        ? 'rgba(255, 255, 255, 0.20)'
        : 'rgba(255, 255, 255, 0.05)'};
    color: var(--gray-1);
  }
`;

const StyledHeader = styled(Header)`
  height: 48px;
  border-bottom: 1px solid var(--gray-5);
  background: var(--gray-10);
  padding: 10px 16px;
`;

export default function HeaderBar() {
  const router = useRouter();
  const { pathname } = router;
  const { user, authEnabled, isDev, signOut } = useAuth();
  const showNav = !pathname.startsWith(Path.Onboarding);
  const isModeling = pathname.startsWith(Path.Modeling);
  // normal users only chat; dev/admin manage modeling, knowledge and APIs
  const showManagementNav = !authEnabled || isDev;

  const userMenu = (
    <Menu
      items={[
        {
          key: 'email',
          disabled: true,
          label: (
            <div>
              {user?.email} <Tag color="geekblue">{user?.role}</Tag>
            </div>
          ),
        },
        { type: 'divider' },
        {
          key: 'switch-project',
          icon: <SwapOutlined />,
          label: 'Switch project',
          onClick: () => router.push(Path.SelectProject),
        },
        {
          key: 'sign-out',
          icon: <LogoutOutlined />,
          label: 'Sign out',
          onClick: () => signOut(),
        },
      ]}
    />
  );

  return (
    <StyledHeader>
      <div
        className="d-flex justify-space-between align-center"
        style={{ marginTop: -2 }}
      >
        <Space size={[48, 0]}>
          <LogoBar />
          {showNav && (
            <Space size={[16, 0]}>
              <StyledButton
                shape="round"
                size="small"
                $isHighlight={pathname.startsWith(Path.Home)}
                onClick={() => router.push(Path.Home)}
              >
                Home
              </StyledButton>
              {showManagementNav && (
                <>
                  <StyledButton
                    shape="round"
                    size="small"
                    $isHighlight={pathname.startsWith(Path.Modeling)}
                    onClick={() => router.push(Path.Modeling)}
                  >
                    Modeling
                  </StyledButton>
                  <StyledButton
                    shape="round"
                    size="small"
                    $isHighlight={pathname.startsWith(Path.Knowledge)}
                    onClick={() => router.push(Path.KnowledgeQuestionSQLPairs)}
                  >
                    Knowledge
                  </StyledButton>
                  <StyledButton
                    shape="round"
                    size="small"
                    $isHighlight={pathname.startsWith(Path.APIManagement)}
                    onClick={() => router.push(Path.APIManagementHistory)}
                  >
                    API
                  </StyledButton>
                </>
              )}
            </Space>
          )}
        </Space>
        <Space size={[16, 0]}>
          {isModeling && <Deploy />}
          {authEnabled && user && (
            <Dropdown overlay={userMenu} placement="bottomRight">
              <StyledButton
                shape="round"
                size="small"
                $isHighlight={false}
                icon={<UserOutlined />}
              >
                {user.email}
              </StyledButton>
            </Dropdown>
          )}
        </Space>
      </div>
    </StyledHeader>
  );
}
