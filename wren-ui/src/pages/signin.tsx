import { useMutation } from '@apollo/client';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SIGN_IN } from '@/apollo/client/graphql/auth';
import { Path } from '@/utils/enum';

export default function SignIn() {
  const router = useRouter();
  const [signIn, { loading }] = useMutation(SIGN_IN, {
    onCompleted: () => router.replace(Path.Projects),
    onError: (error) => message.error(error.message),
  });

  return (
    <div
      className="d-flex justify-center align-center"
      style={{ minHeight: '100vh' }}
    >
      <Card style={{ width: 400 }}>
        <Typography.Title level={3}>Sign in</Typography.Title>
        <Form
          layout="vertical"
          onFinish={(values) => signIn({ variables: { data: values } })}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Sign in
          </Button>
        </Form>
        <Typography.Text className="d-block mt-3">
          No account? <Link href={Path.SignUp}>Sign up</Link>
        </Typography.Text>
      </Card>
    </div>
  );
}
