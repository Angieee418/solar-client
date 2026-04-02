import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Checkbox, message } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { login, saveAuthSession } from '../api/auth'
import AntdIcon from '../components/AntdIcon'

export default function SignIn() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const session = await login({ email: values.email, password: values.password })
      saveAuthSession({ email: values.email, ...session })
      message.success('Login successful!')
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed, please try again'
      message.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign In</h1>
        <p className="auth-subtitle">Sign in to my account</p>
        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<AntdIcon component={MailOutlined} />} placeholder="My Email" size="large" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<AntdIcon component={LockOutlined} />} placeholder="My Password" size="large" />
          </Form.Item>
          <div className="auth-options">
            <Checkbox defaultChecked>Remember Me</Checkbox>
            <a className="auth-forgot">Forgot Password</a>
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading} className="auth-submit-btn">
              Sign In
            </Button>
          </Form.Item>
        </Form>
        <div className="auth-divider">OR</div>
        <Button block size="large" className="auth-alt-btn" onClick={() => navigate('/signup')}>
          Sign Up
        </Button>
        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Sign Up Here</Link>
        </p>
      </div>
    </div>
  )
}
