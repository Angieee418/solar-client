import React, { useEffect, useState } from 'react'
import { Button, Form, Input, message } from 'antd'
import { MailOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import AntdIcon from '../components/AntdIcon'
import { updateUserProfile } from '../api'
import { getAuthProfile, getAuthUserId, updateAuthProfile } from '../api/auth'

const PHONE_PATTERN = /^1[3-9]\d{9}$/

interface ProfileFormValues {
  email: string
  nickName: string
  phone: string
}

export default function Profile() {
  const [form] = Form.useForm<ProfileFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const profile = getAuthProfile()

  useEffect(() => {
    form.setFieldsValue({
      email: profile?.email || '',
      nickName: profile?.nickName || '',
      phone: profile?.phone || '',
    })
  }, [form, profile?.email, profile?.nickName, profile?.phone])

  async function handleSubmit(values: ProfileFormValues) {
    const userId = getAuthUserId()

    if (!userId) {
      message.error('Missing user id in current login session')
      return
    }

    try {
      setSubmitting(true)
      await updateUserProfile(userId, values)
      updateAuthProfile(values)
      message.success('Profile updated successfully.')
    } catch (err: unknown) {
      message.error((err as Error).message || 'Failed to update user information')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pd-page">
      <div className="pd-panel profile-panel">
        <div className="pd-header profile-panel__header">
          <div className="pd-header__title">My Profile</div>
          <div className="pd-header__desc">Update your account information</div>
          <div className="breadcrumb profile-panel__breadcrumb">
            <Link to="/" className="breadcrumb__link">Home</Link>
            <span className="breadcrumb__sep">/</span>
            <span className="breadcrumb__current">Profile</span>
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-card__hero">
            <div className="profile-card__eyebrow">Account</div>
            <h1 className="profile-card__title">Keep your contact details current</h1>
            <p className="profile-card__subtitle">These details are used for notifications and account identification.</p>
          </div>

          <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off" className="profile-form">
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { whitespace: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input prefix={<AntdIcon component={MailOutlined} />} placeholder="My Email" size="large" />
            </Form.Item>

            <Form.Item
              label="Nick Name"
              name="nickName"
              rules={[{ required: true, message: 'Please enter your nick name' }]}
            >
              <Input prefix={<AntdIcon component={UserOutlined} />} placeholder="My Name" size="large" />
            </Form.Item>

            <Form.Item
              label="Phone"
              name="phone"
              rules={[
                { required: true, message: 'Please enter your phone number' },
                { pattern: PHONE_PATTERN, message: 'Please enter a valid phone number' },
              ]}
            >
              <Input prefix={<AntdIcon component={PhoneOutlined} />} placeholder="My Phone" size="large" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={submitting} className="profile-submit-btn">
                Submit
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  )
}