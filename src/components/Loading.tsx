import React from 'react'
import { Spin, Typography } from 'antd'

const { Text } = Typography

interface LoadingProps {
  text?: string
  size?: 'small' | 'default' | 'large'
}

export default function Loading({ text = 'Loading...', size = 'large' }: LoadingProps) {
  return (
    <div className="loading-block">
      <Spin size={size} />
      <div style={{ marginTop: 8 }}><Text type="secondary">{text}</Text></div>
    </div>
  )
}
