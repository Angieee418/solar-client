import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Checkbox, message } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { register } from '../api/auth'
import AntdIcon from '../components/AntdIcon'

export default function SignUp() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      await register({ email: values.email, password: values.password })
      message.success('Registration successful!')
      navigate('/signin')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed, please try again'
      message.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign Up</h1>
        <p className="auth-subtitle">Create your account to manage solar projects</p>
        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email address' },
            ]}
          >
            <Input prefix={<AntdIcon component={MailOutlined} />} placeholder="My Email" size="large" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 8, message: 'Password must be at least 8 characters' },
              {
                pattern: /^(?=.*[A-Za-z])(?=.*\d)/,
                message: 'Password must contain both letters and numbers',
              },
            ]}
          >
            <Input.Password prefix={<AntdIcon component={LockOutlined} />} placeholder="My Password" size="large" />
          </Form.Item>
          <Form.Item
            label="Confirmed Password"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Passwords do not match'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<AntdIcon component={LockOutlined} />} placeholder="My Password" size="large" />
          </Form.Item>
          <div className="auth-options">
            <Checkbox defaultChecked>Remember Me</Checkbox>
            <a className="auth-forgot">Forgot Password</a>
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading} className="auth-submit-btn">
              Sign Up
            </Button>
          </Form.Item>
        </Form>
        <div className="auth-divider">OR</div>
        <Button block size="large" className="auth-alt-btn" onClick={() => navigate('/signin')}>
          Sign In
        </Button>
        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Sign Up Here</Link>
        </p>
      </div>
    </div>
  )
}
