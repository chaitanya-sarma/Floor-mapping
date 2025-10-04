import { Device } from './device';

export interface Room {
  id: string;
  points: number[];
  devices: Device[]; // ✅ store full Device objects
  fillColor: string;
  strokeColor: string;
  name?: string; // ✅ new
  type?: string; // ✅ new
}
