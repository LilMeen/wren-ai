import { useMutation } from '@apollo/client';
import { Button, Card, Form, Input, Select, Typography, message } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SIGN_UP } from '@/apollo/client/graphql/auth';
import { Path } from '@/utils/enum';

export default function SignUp() {
  const router = useRouter();
  const [signUp, { loading }] = useMutation(SIGN_UP, {
    onCompleted: () => router.replace(Path.Projects),
    onError: (error) => message.error(error.message),
  });

  return (
    <div
      className="d-flex justify-center align-center"
      style={{ minHeight: '100vh' }}
    >
      <Card style={{ width: 400 }}>
        <Typography.Title level={3}>Sign up</Typography.Title>
        <Form
          layout="vertical"
          initialValues={{ role: 'user' }}
          onFinish={(values) => signUp({ variables: { data: values } })}
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
            rules={[{ required: true, min: 8 }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'User', value: 'user' },
                { label: 'Developer', value: 'dev' },
                { label: 'Admin', value: 'admin' },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Sign up
          </Button>
        </Form>
        <Typography.Text className="d-block mt-3">
          Already have an account? <Link href={Path.SignIn}>Sign in</Link>
        </Typography.Text>
      </Card>
    </div>
  );
}
