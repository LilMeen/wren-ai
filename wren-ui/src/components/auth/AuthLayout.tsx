import Image from 'next/image';
import styled from 'styled-components';

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, var(--gray-10) 0%, #1f1f48 100%);
  padding: 24px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 400px;
  background: var(--gray-1);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  padding: 32px;
`;

const Title = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: var(--gray-10);
  margin-bottom: 4px;
`;

const Subtitle = styled.div`
  color: var(--gray-7);
  margin-bottom: 24px;
`;

const Footer = styled.div`
  margin-top: 24px;
  color: var(--gray-1);
  opacity: 0.45;
  font-size: 12px;
`;

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <Wrapper>
      <div className="mb-6">
        <Image
          src="/images/logo-white-with-text.svg"
          alt="Wren AI"
          width={163}
          height={40}
        />
      </div>
      <Card>
        <Title>{title}</Title>
        <Subtitle>{subtitle}</Subtitle>
        {children}
      </Card>
      <Footer>Wren AI — ask questions about your data in plain English</Footer>
    </Wrapper>
  );
}
