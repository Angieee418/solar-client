import React from 'react'
import { Alert } from 'antd'

interface ErrorAlertProps {
  message?: string
  description?: string
}

export default function ErrorAlert({ message = '发生错误', description }: ErrorAlertProps) {
  return <Alert type="error" message={message} description={description} showIcon />
}
