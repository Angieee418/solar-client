import React from 'react'

type IconComponent = React.ComponentType<any>

interface AntdIconProps {
  component: IconComponent
  className?: string
  style?: React.CSSProperties
}

export default function AntdIcon({ component: Component, ...props }: AntdIconProps) {
  return <Component {...props} />
}