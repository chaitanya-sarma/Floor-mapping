export interface Device {
  id: string;
  name: string;
  type: string; // e.g., 'Light', 'Sensor', 'Camera'
  roomId?: string; // linked to Room.id
  x?: number; // position on canvas
  y?: number;
}