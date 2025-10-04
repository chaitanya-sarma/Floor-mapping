import { Component, ViewChild } from '@angular/core';
import { CommonModule, NgFor, NgIf, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';

import { ImageUploader } from '../../shared/image-uploader/image-uploader';
import { CanvasOverlay } from './components/canvas-overlay/canvas-overlay';
import { ConfirmResetDialog } from './components/confirm-reset-dialog/confirm-reset-dialog';
import { Layout } from '../../core/services/layout';
import { Device } from '../../core/models/device';
import { Room } from '../../core/models/room';
import { RoomDetailsDialog } from './components/room-details-dialog/room-details-dialog';
import { AssignDeviceDialog } from './components/assign-device-dialog/assign-device-dialog';
import { AssignChoiceDialog } from './components/assign-device-dialog/assign-choice-dialog';
import { ROOM_TYPE_COLORS } from '../../core/utils/room-colors';
import { getRoomColor, hexToRgba } from '../../core/utils/color-utils';


@Component({
  selector: 'app-floorplan-mapper',
  standalone: true,
  imports: [
    ImageUploader,
    CanvasOverlay,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatListModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    CommonModule,
    NgFor,
    NgIf,
    NgStyle // ✅ Needed for [ngStyle] on mat-chip
  ],
  templateUrl: './floorplan-mapper.html',
  styleUrls: ['./floorplan-mapper.scss'],
})
export class FloorplanMapper {
  @ViewChild(CanvasOverlay) overlay!: CanvasOverlay;
  @ViewChild(ImageUploader) uploader!: ImageUploader;

  uploadedImage?: HTMLImageElement;
  draggedDevice?: Device;
  expandedRoomId?: string;

  availableDevices: Device[] = [
    { id: 'd1', name: 'Occupancy Sensor', type: 'Sensor' },
    { id: 'd2', name: 'People Tracking Sensor', type: 'Sensor' },
    { id: 'd3', name: 'Router', type: 'Sensor' },
    { id: 'd4', name: 'LTE Hub', type: 'Sensor' },
  ]; // ['Occupancy Sensor', 'People Tracking Sensor', 'Router', 'LTE Hub']

  constructor(public layout: Layout, private dialog: MatDialog, private snackBar: MatSnackBar) {}

  // Search query bound to the sidepanel search input
  searchQuery: string = '';

  // Rooms filtered by name or type
  get filteredRooms(): Room[] {
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (!q) return this.rooms;
    return this.rooms.filter(r => {
      const name = (r.name || '').toLowerCase();
      const type = (r.type || '').toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }

  get rooms(): Room[] {
    return this.layout.rooms();
  }

  // ✅ Added to fix trackBy error
  trackByRoomId(_: number, room: Room) {
    return room.id;
  }

  getRoomColor(type?: string): string {
    if (!type) return ROOM_TYPE_COLORS.Default;
    return ROOM_TYPE_COLORS[type] || ROOM_TYPE_COLORS.Default;
  }

  onImageLoaded(image: HTMLImageElement) {
    this.uploadedImage = image;

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(image, 0, 0);
      const base64 = canvas.toDataURL('image/png');
      this.layout.setBackgroundImage(base64); // update layout
      // immediately update overlay so the image shows without waiting for the poll
      if (this.overlay && typeof this.overlay.setBackgroundImageFromBase64 === 'function') {
        this.overlay.setBackgroundImageFromBase64(base64);
      }
    }
  }

  // Reset entire app state: clear background, rooms, devices, and canvas
  resetAll(): void {
    const ref = this.dialog.open(ConfirmResetDialog, { width: '320px' });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      // Clear Layout state
      this.layout.setRooms([]);
      this.layout.setDevices([]);
      this.layout.setBackgroundImage(null as any);

      // Clear local uploaded image
      this.uploadedImage = undefined;

      // Reset the image uploader's internal file input so the same file can be selected again
      if (this.uploader && typeof this.uploader.reset === 'function') {
        this.uploader.reset();
      }

      // Clear overlay visuals
      if (this.overlay && typeof this.overlay.clearAll === 'function') {
        this.overlay.clearAll();
      }
    });
  }


  onDragStart(event: DragEvent, device: Device) {
    this.draggedDevice = device;
    event.dataTransfer?.setData('text/plain', JSON.stringify(device));
  }

  onDeviceDropped(event: { x: number; y: number; roomId?: string }) {
    if (!this.draggedDevice) return;

    // If dropped outside a room, inform the user and do not add the device
    if (!event.roomId) {
      try {
        this.snackBar.open('Drop the device inside a room to place it', undefined, { duration: 4000 });
      } catch (err) {
        console.warn('Device dropped outside any room.');
      }

      this.draggedDevice = undefined;
      return;
    }

    // Find the target room and rooms of the same type
    const targetRoom = this.layout.rooms().find(r => r.id === event.roomId);
    const sameTypeRooms = targetRoom?.type ? this.layout.rooms().filter(r => r.type === targetRoom.type) : [targetRoom!];

    // First show a compact choice dialog (Assign to this room / Assign to all same-type rooms → opens full picker)
    const choiceRef = this.dialog.open(AssignChoiceDialog, {
      width: '360px',
      data: { deviceName: this.draggedDevice.name }
    });

    choiceRef.afterClosed().subscribe(choice => {
      if (!choice || choice === 'cancel') {
        this.draggedDevice = undefined;
        return;
      }

      if (choice === 'single') {
        const newDevice: Device = { ...this.draggedDevice!, id: crypto.randomUUID(), x: event.x, y: event.y, roomId: event.roomId };
        this.layout.addDevice(newDevice);
        this.layout.assignDeviceToRoom(newDevice, event.roomId!);
        if (this.overlay && typeof this.overlay.addDeviceMarker === 'function') {
          this.overlay.addDeviceMarker(newDevice.x!, newDevice.y!, newDevice.name, newDevice.roomId, newDevice.id);
        }

        this.draggedDevice = undefined;
        return;
      }

      if (choice === 'goto-group') {
        const dlgRef = this.dialog.open(AssignDeviceDialog, {
          width: '420px',
          data: { deviceName: this.draggedDevice!.name, targetRoomId: targetRoom?.id, sameTypeRooms }
        });

        dlgRef.afterClosed().subscribe((selectedIds: string[] | null) => {
          if (!selectedIds || selectedIds.length === 0) {
            this.draggedDevice = undefined;
            return;
          }

          for (const roomId of selectedIds) {
            const room = this.layout.rooms().find(r => r.id === roomId);
            if (!room) continue;

            const isTarget = roomId === event.roomId;
            const pos = isTarget ? { x: event.x, y: event.y } : this.computeCentroid(room.points);

            const newDevice: Device = { ...this.draggedDevice!, id: crypto.randomUUID(), x: pos.x, y: pos.y, roomId: roomId };
            this.layout.addDevice(newDevice);
            this.layout.assignDeviceToRoom(newDevice, roomId);
            if (this.overlay && typeof this.overlay.addDeviceMarker === 'function') {
              this.overlay.addDeviceMarker(newDevice.x!, newDevice.y!, newDevice.name, newDevice.roomId, newDevice.id);
            }
          }

          this.draggedDevice = undefined;
        });
      }
    });
  }  

  onRoomCreated(room: Room) {
    const dialogRef = this.dialog.open(RoomDetailsDialog, {
      width: '300px',
      data: { name: '', type: '' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result || !result.name?.trim() || !result.type?.trim()) {
        // Cancel room creation — remove shape
        this.overlay.removeRoomShape(room.id);
        return;
      }

      const finalizedRoom: Room = {
        ...room,
        name: result.name,
        type: result.type,
        fillColor: hexToRgba(getRoomColor(result.type), 0.3),
        strokeColor: getRoomColor(result.type),
      };

      this.layout.setRooms([...this.layout.rooms(), finalizedRoom]);
      this.overlay.updateRoomAppearance(room.id, result.type);
    });
  }



  toggleRoom(roomId: string) {
    const next = this.expandedRoomId === roomId ? undefined : roomId;
    this.expandedRoomId = next;

    // Highlight on canvas when expanded, clear when collapsed
    if (this.overlay && typeof this.overlay.highlightRoom === 'function') {
      if (next) {
        this.overlay.highlightRoom(next);
        // Auto-center on room when expanded (compute centroid)
        const room = this.layout.rooms().find(r => r.id === next);
        if (room && room.points && room.points.length >= 2 && typeof this.overlay.centerOn === 'function') {
          const centroid = this.computeCentroid(room.points);
          this.overlay.centerOn(centroid.x, centroid.y, true);
          // Small pulse after centering to emphasize focus
          if (typeof this.overlay.pulseRoom === 'function') {
            // Delay a bit so the center animation is visible first
            setTimeout(() => this.overlay.pulseRoom(next), 350);
          }
        }
      } else {
        this.overlay.clearRoomHighlightPublic();
      }
    }
  }

  // Simple centroid for polygon (average of vertices) — good enough for PoC
  // Area-weighted centroid (polygon centroid). Falls back to average of vertices if degenerate.
  private computeCentroid(points: number[]): { x: number; y: number } {
    try {
      const n = points.length / 2;
      if (n < 3) {
        // not a polygon — fallback to average
        let sx = 0, sy = 0;
        for (let i = 0; i < points.length; i += 2) {
          sx += points[i];
          sy += points[i + 1];
        }
        const cnt = Math.max(1, n);
        return { x: sx / cnt, y: sy / cnt };
      }

      let areaAcc = 0;
      let cxAcc = 0;
      let cyAcc = 0;

      for (let i = 0; i < points.length; i += 2) {
        const x0 = points[i];
        const y0 = points[i + 1];
        const j = (i + 2) % points.length;
        const x1 = points[j];
        const y1 = points[j + 1];

        const cross = x0 * y1 - x1 * y0;
        areaAcc += cross;
        cxAcc += (x0 + x1) * cross;
        cyAcc += (y0 + y1) * cross;
      }

      const area = areaAcc / 2;
      if (Math.abs(area) < 1e-6) {
        // degenerate polygon — fallback to average
        let sx = 0, sy = 0;
        for (let i = 0; i < points.length; i += 2) {
          sx += points[i];
          sy += points[i + 1];
        }
        const cnt = Math.max(1, n);
        return { x: sx / cnt, y: sy / cnt };
      }

      const cx = cxAcc / (6 * area);
      const cy = cyAcc / (6 * area);
      return { x: cx, y: cy };
    } catch (err) {
      // on any unexpected error, fallback to simple average
      let sx = 0, sy = 0, cnt = 0;
      for (let i = 0; i < points.length; i += 2) {
        sx += points[i];
        sy += points[i + 1];
        cnt += 1;
      }
      return { x: sx / Math.max(1, cnt), y: sy / Math.max(1, cnt) };
    }
  }

  editRoom(room: Room) {
    const dialogRef = this.dialog.open(RoomDetailsDialog, {
      width: '300px',
      data: { name: room.name || '', type: room.type || '' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const updatedRooms = this.layout.rooms().map(r =>
          r.id === room.id ? {
            ...r,
            name: result.name,
            type: result.type,
            fillColor: hexToRgba(getRoomColor(result.type), 0.3),
            strokeColor: getRoomColor(result.type),
          } : r
        );
        this.layout.setRooms(updatedRooms);
        this.overlay.updateRoomAppearance(room.id, result.type);
      }
    });
  }

  deleteRoom(room: Room) {
    const confirmed = confirm(`Delete room "${room.name || room.id}"?`);
    if (!confirmed) return;

    this.layout.setRooms(this.layout.rooms().filter(r => r.id !== room.id));

    const remainingDevices = this.layout.devices().filter(d => d.roomId !== room.id);
    this.layout.setDevices(remainingDevices);
    
    this.overlay.removeDeviceMarkersForRoom(room.id);
    this.overlay.removeRoomShape(room.id);
  }

  removeDevice(roomId: string, deviceId: string) {
    const remainingDevices = this.layout.devices().filter(d => d.id !== deviceId);
    console.log(remainingDevices);
    this.layout.setDevices(remainingDevices);
    // Remove from room devices list
    const updatedRooms = this.layout.rooms().map(r => r.id === roomId ? { ...r, devices: r.devices.filter(d => d.id !== deviceId) } : r);
    this.layout.setRooms(updatedRooms);

    // Remove marker from canvas if present
    if (this.overlay && typeof this.overlay.removeDeviceMarker === 'function') {
      this.overlay.removeDeviceMarker(deviceId);
    }
  }

  exportRooms() {
    // Prefer the canonical background image stored in Layout (may be set by import or upload)
    let backgroundImageBase64: string | null = this.layout.backgroundImage() ?? null;

    // If Layout doesn't have a background but we have a local uploadedImage, convert it
    if (!backgroundImageBase64 && this.uploadedImage) {
      const canvas = document.createElement('canvas');
      canvas.width = this.uploadedImage.naturalWidth;
      canvas.height = this.uploadedImage.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(this.uploadedImage, 0, 0);
        backgroundImageBase64 = canvas.toDataURL('image/png');
      }
    }

    // Build export object
    const data = {
      backgroundImage: backgroundImageBase64,
      rooms: this.layout.rooms().map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        points: room.points,
        fillColor: room.fillColor,
        strokeColor: room.strokeColor,
        devices: room.devices.map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          x: d.x,
          y: d.y,
          roomId: d.roomId
        }))
      })),
      devices: this.layout.devices().map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        x: d.x,
        y: d.y,
        roomId: d.roomId
      }))
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'floorplan-layout.json';
    a.click();

    URL.revokeObjectURL(url); // cleanup
  }


  onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);

        // 1. Update Layout state so the Rooms panel refreshes
        this.layout.importLayout(data);

        // 2. Redraw the canvas with imported background, rooms, and devices
        // If the imported JSON contains a background image, set it on the overlay immediately
        if (data.backgroundImage && typeof this.overlay?.setBackgroundImageFromBase64 === 'function') {
          this.overlay.setBackgroundImageFromBase64(data.backgroundImage);
        }
        this.overlay.loadFromLayout(data);

      } catch (err) {
        console.error('Invalid JSON file', err);
      }
    };

    reader.readAsText(file);
  }


}
