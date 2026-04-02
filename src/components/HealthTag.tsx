import React from 'react'
import { Tag } from 'antd'

interface HealthTagProps {
  status?: string
}

export default function HealthTag({ status = 'offline' }: HealthTagProps) {
  const s = String(status || '').toLowerCase()
  if (s === 'ok') return <Tag className="health-tag-ok">OK</Tag>
  if (s === 'warning') return <Tag className="health-tag-warning">Warning</Tag>
  return <Tag className="health-tag-offline">Offline</Tag>
}
