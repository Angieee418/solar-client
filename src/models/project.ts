import type { DeviceModel } from './device'

export interface ProjectModel {
  id: string
  projectId?: string
  _id?: string
  name: string
  projectName?: string
  title?: string
  description?: string
  status?: string
  health?: string
  devices?: DeviceSummary[]
  deviceCounts?: DeviceCounts
  statusCounts?: StatusCounts
  deviceStatusCounts?: StatusCounts
  deviceHealthCounts?: StatusCounts
  healthSummary?: StatusCounts
  summary?: StatusCounts
  solarControllerCount?: number
  weatherSensorCount?: number
}

export interface DeviceCounts {
  solarController?: number
  solarControllers?: number
  solar?: number
  weatherSensor?: number
  weatherSensors?: number
  weather?: number
}

export interface StatusCounts {
  offline?: number
  offlineCount?: number
  offLineCount?: number
  warning?: number
  warningCount?: number
  warn?: number
  warnCount?: number
  ok?: number
  okCount?: number
  online?: number
  onlineCount?: number
  healthy?: number
  healthyCount?: number
}

export interface DeviceSummary {
  id?: string
  deviceId?: string
  _id?: string
  name?: string
  deviceName?: string
  type?: string
  category?: string
  status?: string
  health?: string
  state?: string
  connectionStatus?: string
  deviceStatus?: string
}

export type HealthStatus = 'ok' | 'warning' | 'offline'

export interface ProjectListResponse {
  data?: ProjectModel[]
  projects?: ProjectModel[]
}

export interface ProjectDetailResponse {
  code?: number
  message?: string
  data?: ProjectModel
}

export interface ProjectDevicesResponse {
  code?: number
  message?: string
  data?: {
    devices: DeviceModel[] | {
      SolarControllers?: DeviceModel[]
      WeatherSensors?: DeviceModel[]
    }
  }
}
