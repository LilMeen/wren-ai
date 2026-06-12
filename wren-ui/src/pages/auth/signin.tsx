import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, Form, Input } from 'antd';
import MailOutlined from '@ant-design/icons/MailOutlined';
import LockOutlined from '@ant-design/icons/LockOutlined';
import AuthLayout from '@/components/auth/AuthLayout';
import useAuth from '@/hooks/useAuth';
import { Path } from '@/utils/enum';

export default function SignIn() {
  const router = useRouter();
  const { refetchUser } = useAuth();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { email: string; password: string }) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to sign in. Please try again.');
        return;
      }
      await refetchUser();
      router.push(Path.SelectProject);
    } catch {
      setError('Failed to sign in. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      {error && (
        <Alert className="mb-4" type="error" showIcon message={error} />
      )}
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Please enter your email.' },
            { type: 'email', message: 'Please enter a valid email address.' },
          ]}
        >
          <Input
            prefix={<MailOutlined className="gray-6" />}
            placeholder="you@company.com"
            size="large"
            autoComplete="email"
          />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: 'Please enter your password.' }]}
        >
          <Input.Password
            prefix={<LockOutlined className="gray-6" />}
            placeholder="Your password"
            size="large"
            autoComplete="current-password"
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={submitting}
        >
          Sign in
        </Button>
      </Form>
      <div className="text-center mt-4 gray-7">
        Don&apos;t have an account?{' '}
        <Link href={Path.SignUp}>Create one</Link>
      </div>
    </AuthLayout>
  );
}
