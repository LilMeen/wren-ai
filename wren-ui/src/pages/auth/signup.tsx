import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, Form, Input, Select } from 'antd';
import MailOutlined from '@ant-design/icons/MailOutlined';
import LockOutlined from '@ant-design/icons/LockOutlined';
import AuthLayout from '@/components/auth/AuthLayout';
import useAuth from '@/hooks/useAuth';
import { Path } from '@/utils/enum';

const ROLE_OPTIONS = [
  {
    value: 'user',
    label: 'User — chat with projects and explore data',
  },
  {
    value: 'dev',
    label: 'Developer — create and manage projects',
  },
  {
    value: 'admin',
    label: 'Admin — reserved for system administration',
  },
];

export default function SignUp() {
  const router = useRouter();
  const { refetchUser } = useAuth();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: {
    email: string;
    password: string;
    role: string;
  }) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          role: values.role,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to sign up. Please try again.');
        return;
      }
      await refetchUser();
      router.push(Path.SelectProject);
    } catch {
      setError('Failed to sign up. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up an account to start working with your data"
    >
      {error && (
        <Alert className="mb-4" type="error" showIcon message={error} />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        initialValues={{ role: 'user' }}
      >
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
          rules={[
            { required: true, message: 'Please enter a password.' },
            { min: 8, message: 'Password must be at least 8 characters.' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="gray-6" />}
            placeholder="At least 8 characters"
            size="large"
            autoComplete="new-password"
          />
        </Form.Item>
        <Form.Item
          label="Confirm password"
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password.' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match.'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="gray-6" />}
            placeholder="Re-enter your password"
            size="large"
            autoComplete="new-password"
          />
        </Form.Item>
        <Form.Item
          label="Role"
          name="role"
          rules={[{ required: true, message: 'Please select a role.' }]}
        >
          <Select size="large" options={ROLE_OPTIONS} />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={submitting}
        >
          Create account
        </Button>
      </Form>
      <div className="text-center mt-4 gray-7">
        Already have an account? <Link href={Path.SignIn}>Sign in</Link>
      </div>
    </AuthLayout>
  );
}
