export interface DeviceModel {
  id?: string
  deviceId?: string
  _id?: string
  name?: string
  deviceName?: string
  type?: string
  category?: string
  health?: string
  status?: string
  lastSeen?: string
  projectId?: string
  project?: string
  pvVoltage?: number | string
  batterySoc?: number | string
  temperature?: number | string
  humidity?: number | string
  loadPower?: number | string
  irradiance?: number | string
}

export interface DeviceMeta {
  deviceId: string
  name: string
  projectId: string
  lastSeen: string | null
  health: string
  deviceType: string
  metrics: Record<string, number | string | undefined>
}

export interface TelemetryPoint {
  timestamp?: string
  time?: string
  ts?: string
  createdAt?: string
  _ts?: string
  batterySoc?: number
  loadPower?: number
  temperature?: number
  irradiance?: number
  humidity?: number
  health?: string
  status?: string
  deviceName?: string
  name?: string
  projectId?: string
  project?: string
  metrics?: Record<string, number | string | undefined>
  [key: string]: unknown
}

export interface DeviceDataResponse {
  code?: number
  message?: string
  data?: {
    trend_data?: TelemetryPoint[]
    telemetries?: TelemetryPoint[]
    telemetry?: TelemetryPoint[]
    data?: TelemetryPoint[]
    device?: Partial<DeviceModel>
  }
}

export interface DeviceInfoResponse {
  code?: number
  message?: string
  data?: DeviceModel & {
    telemetry?: TelemetryPoint[]
  }
  device?: DeviceModel
  telemetry?: TelemetryPoint[]
  device_info?: DeviceModel
}

export interface IngestPayload {
  deviceId: string
  projectId: number
  type: string
  ts?: string
  metrics: Record<string, number | string | undefined>
}
