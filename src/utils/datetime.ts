export function parseTimestamp(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    const timestamp = value < 1e12 ? value * 1000 : value
    const date = new Date(timestamp)
    return isNaN(date.getTime()) ? null : date
  }

  const raw = String(value).trim()
  if (!raw) return null

  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw)
    const timestamp = raw.length <= 10 ? numeric * 1000 : numeric
    const date = new Date(timestamp)
    return isNaN(date.getTime()) ? null : date
  }

  const normalized = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(raw) && !/(Z|[+-]\d{2}:?\d{2})$/.test(raw)
    ? `${raw}Z`
    : raw
  const date = new Date(normalized)
  return isNaN(date.getTime()) ? null : date
}

export function formatTimestamp(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback
  const date = parseTimestamp(value)
  if (!date) return String(value)
  return date.toLocaleString()
}

export function formatTimeLabel(value: unknown): string {
  const date = parseTimestamp(value)
  if (!date) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function getTelemetryPointTime(point: Record<string, unknown>): number {
  const raw = point.timestamp || point.time || point.ts || point.createdAt || point._ts || Date.now()
  return parseTimestamp(raw)?.getTime() ?? Date.now()
}