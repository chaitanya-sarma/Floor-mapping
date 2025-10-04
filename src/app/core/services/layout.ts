import { Injectable, signal } from '@angular/core';
import { Room } from '../models/room';
import { Device } from '../models/device';

@Injectable({ providedIn: 'root' })
export class Layout {
  private _rooms = signal<Room[]>([]);
  private _devices = signal<Device[]>([]);
  private _backgroundImage = signal<string | null>(null);

  rooms = this._rooms.asReadonly();
  devices = this._devices.asReadonly();
  backgroundImage = this._backgroundImage.asReadonly();

  addRoom(room: Room) {
    this._rooms.update(rooms => [...rooms, room]);
  }

  setRooms(updated: Room[]) {
    this._rooms.set(updated);
  }

  addDevice(device: Device) {
    this._devices.update(devices => [...devices, device]);
  }

  setDevices(updated: Device[]) {
    this._devices.set(updated);
  }

  setBackgroundImage(image: string | null) {
    this._backgroundImage.set(image);
  }

  assignDeviceToRoom(device: Device, roomId: string) {
    this._rooms.update(rooms =>
      rooms.map(room =>
        room.id === roomId
          ? { ...room, devices: [...room.devices, device] }
          : room
      )
    );
  }
  
  importLayout(data: { rooms?: Room[]; devices?: Device[]; backgroundImage?: string | null }) {
    const rooms = data.rooms ?? [];

    // Collect devices from top-level list and from any room.device lists
    const topDevices = data.devices ?? [];
    const roomDevices = ([] as Device[]).concat(...(rooms.map(r => r.devices || [])));

    // Merge and deduplicate devices by id (roomDevices may duplicate topDevices)
    const deviceMap = new Map<string, Device>();
    topDevices.forEach(d => { if (d && d.id) deviceMap.set(d.id, d); });
    roomDevices.forEach(d => { if (d && d.id && !deviceMap.has(d.id)) deviceMap.set(d.id, d); });

    const mergedDevices = Array.from(deviceMap.values());

    this._rooms.set(rooms);
    this._devices.set(mergedDevices);
    this._backgroundImage.set(data.backgroundImage ?? null);
  }
}
