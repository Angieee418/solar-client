import React, { useEffect, useState } from 'react'
import { Card, List, Button, Space, Input } from 'antd'
import { Link } from 'react-router-dom'
import { getDevices } from '../api'
import type { DeviceModel } from '../models/device'

export default function Devices() {
  const [list, setList] = useState<DeviceModel[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => { fetchList() }, [])

  function fetchList() {
    setLoading(true)
    getDevices()
      .then((data) => setList(data as DeviceModel[] || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  const filtered = list.filter(d => d.name?.includes(q) || d.id?.toString().includes(q))

  return (
    <div>
      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Input.Search placeholder="Search device name or ID" onSearch={v => setQ(v)} allowClear style={{ width: 220 }} />
          <Button onClick={fetchList}>Refresh</Button>
        </Space>

          <List
          loading={loading}
          dataSource={filtered}
          renderItem={(item) => (
            <List.Item actions={[<Link key="detail" to={`/devices/${item.id}`}>View</Link>]}>
              <List.Item.Meta title={item.name || `Device ${item.id}`} description={`Status: ${item.status || 'Unknown'}`} />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
