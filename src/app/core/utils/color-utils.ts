import { ROOM_TYPE_COLORS } from './room-colors';

export function getRoomColor(type?: string): string {
  if (!type) return ROOM_TYPE_COLORS.Default;
  return ROOM_TYPE_COLORS[type] || ROOM_TYPE_COLORS.Default;
}

export function hexToRgba(hex: string, alpha: number): string {
  const bigint = parseInt(hex.replace('#', ''), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
