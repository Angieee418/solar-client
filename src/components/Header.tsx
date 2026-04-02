import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from 'antd'
import { BulbOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import AntdIcon from './AntdIcon'
import { clearAuthSession } from '../api/auth'

const { Header } = Layout

export default function HeaderBar() {
  const navigate = useNavigate()

  function handleLogout() {
    clearAuthSession()
    navigate('/signin', { replace: true })
  }

  return (
    <Header className="app-header">
      <div className="app-header__content">
        <div className="app-header__brand">
          <div className="app-header__brand-icon">
            <AntdIcon component={BulbOutlined} />
          </div>
          <div className="app-header__brand-text">Solar System</div>
        </div>
        <div className="app-header__actions">
          <button type="button" className="app-header__action" aria-label="Profile" onClick={() => navigate('/profile')}>
            <AntdIcon component={UserOutlined} />
          </button>
          <button type="button" className="app-header__action app-header__action--logout" aria-label="Log out" onClick={handleLogout}>
            <AntdIcon component={LogoutOutlined} />
          </button>
        </div>
      </div>
    </Header>
  )
}
