import React from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import DeviceDetail from './pages/DeviceDetail'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'
import Profile from './pages/Profile'
import Onboard from './pages/Onboard'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import HeaderBar from './components/Header'
import { isAuthenticated } from './api/auth'

const { Content } = Layout

const AUTH_ROUTES = ['/onboard', '/signin', '/signup']

export default function App() {
  const location = useLocation()
  const isAuthPage = AUTH_ROUTES.includes(location.pathname)
  const authenticated = isAuthenticated()

  if (isAuthPage) {
    if (authenticated) {
      return <Navigate to="/" replace />
    }

    return (
      <Routes>
        <Route path="/onboard" element={<Onboard />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    )
  }

  if (!authenticated) {
    return <Navigate to="/signin" replace />
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <HeaderBar />
      <Content className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/devices/:id" element={<DeviceDetail />} />
        </Routes>
      </Content>
    </Layout>
  )
}
