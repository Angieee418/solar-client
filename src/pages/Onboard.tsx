import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import AntdIcon from '../components/AntdIcon'

export default function Onboard() {
  const navigate = useNavigate()

  return (
    <div className="onboard-page">
      <div className="onboard-card">
        <div className="onboard-preview">
          <div className="onboard-preview__mock">
            <AntdIcon component={ThunderboltOutlined} style={{ fontSize: 48, color: '#6f42f5' }} />
          </div>
        </div>
        <h1 className="onboard-title">Solar System</h1>
        <p className="onboard-subtitle">manage your solar projects</p>
        <div className="onboard-actions">
          <Button
            type="primary"
            block
            size="large"
            className="onboard-btn-signin"
            onClick={() => navigate('/signin')}
          >
            Sign In
          </Button>
          <Button
            block
            size="large"
            className="onboard-btn-signup"
            onClick={() => navigate('/signup')}
          >
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  )
}
