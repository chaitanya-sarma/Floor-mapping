import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import Konva from 'konva';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Layout } from '../../../../core/services/layout';
import { Room } from '../../../../core/models/room';
import { Device } from '../../../../core/models/device';
import { isPointInPolygon } from '../../../../core/utils/geometry';
import { ROOM_TYPE_COLORS } from '../../../../core/utils/room-colors';

@Component({
  selector: 'app-canvas-overlay',
  standalone: true,
  imports: [NgIf, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './canvas-overlay.html',
  styleUrls: ['./canvas-overlay.scss'],
})
export class CanvasOverlay implements AfterViewInit, OnChanges {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() backgroundImage?: HTMLImageElement;

  // Emits stage coordinates and optional roomId (only if dropped inside a room)
  @Output() deviceDropped = new EventEmitter<{ x: number; y: number; roomId?: string }>();

  @Output() roomCreated = new EventEmitter<Room>();
  // Emit when a room polygon is clicked on the canvas
  @Output() roomClicked = new EventEmitter<string>();

  // Toolbar state (used by template)
  drawingMode = false;
  toolbarCollapsed = false;

  private untrackedBackgroundWatcher: any;
  private lastLoadedImage: string | null = null;


  // Internal drawing state
  private shapeType: 'polygon' | 'rectangle' = 'polygon';
  private startRectPoint?: { x: number; y: number };
  private points: number[] = [];

  // Konva graph
  private stage!: Konva.Stage;
  private imageLayer!: Konva.Layer;
  private drawLayer!: Konva.Layer;
  private deviceLayer!: Konva.Layer;
  private tempLine!: Konva.Line;

  // Room shapes and hover state
  private roomShapes: Map<string, Konva.Line> = new Map();
  private hoveredRoomId?: string;

  // Zoom config
  private readonly scaleBy = 1.05;
  private readonly minScale = 0.5;
  private readonly maxScale = 3;

  constructor(private layout: Layout) {}

  // Public API: center the stage on a specific stage coordinate
  centerOn(x: number, y: number, animate = true) {
    if (!this.stage) return;
    const scale = this.stage.scaleX() || 1;
    const targetX = this.stage.width() / 2 - x * scale;
    const targetY = this.stage.height() / 2 - y * scale;

    if (animate) {
      this.stage.to({ x: targetX, y: targetY, duration: 0.3 });
    } else {
      this.stage.position({ x: targetX, y: targetY });
      this.stage.batchDraw();
    }
  }

  ngOnInit() {
    this.layout.backgroundImage(); // access once to trigger tracking

    this.untrackedBackgroundWatcher = setInterval(() => {
      const image = this.layout.backgroundImage();
      if (image && image !== this.lastLoadedImage) {
        this.lastLoadedImage = image;

        const img = new Image();
        img.onload = () => {
          this.backgroundImage = img;
          this.tryLoadBackground();
        };
        img.src = image;
      }
    }, 500); // poll every 500ms
  }

  // Public: set the background image immediately from a base64 string (parent should call this after upload)
  public setBackgroundImageFromBase64(base64: string | null): void {
    if (!base64) {
      this.backgroundImage = undefined;
      this.lastLoadedImage = null;
      this.imageLayer.destroyChildren();
      this.imageLayer.batchDraw();
      return;
    }

    // If the same image is already loaded, still reload to be deterministic
    this.lastLoadedImage = base64;

    const img = new Image();
    img.onload = () => {
      this.backgroundImage = img;
      this.tryLoadBackground();
    };
    img.src = base64;
  }


  ngAfterViewInit(): void {
    this.initStage();
    this.tryLoadBackground();
    // Fit stage to container initially
    this.resizeStageToContainer();
    // Optional: handle container resize
    window.addEventListener('resize', this.resizeStageToContainer);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['backgroundImage'] && this.stage) {
      this.tryLoadBackground();
    }
  }

  // Clean up (optional but nice to have)
  ngOnDestroy(): void {
    clearInterval(this.untrackedBackgroundWatcher);
    window.removeEventListener('resize', this.resizeStageToContainer);
    this.stage?.destroy();
  }

  // Public API for floating toolbar
  enableDrawingMode(shape: 'polygon' | 'rectangle'): void {
    this.drawingMode = true;
    this.shapeType = shape;
    this.points = [];
    this.startRectPoint = undefined;
    this.tempLine.points([]);
    // Disable panning while drawing for better precision
    this.stage.draggable(false);
    this.drawLayer.batchDraw();
  }

  disableDrawingMode(): void {
    this.drawingMode = false;
    this.points = [];
    this.startRectPoint = undefined;
    this.tempLine.points([]);
    // Re-enable panning
    this.stage.draggable(true);
    this.drawLayer.batchDraw();
  }

  // Zoom control methods
  zoomIn(): void {
    if (!this.stage) return;
    
    const oldScale = this.stage.scaleX();
    const newScale = Math.min(this.maxScale, oldScale * this.scaleBy);
    
    // Zoom towards the center of the stage
    const center = {
      x: this.stage.width() / 2,
      y: this.stage.height() / 2
    };
    
    const mousePointTo = {
      x: (center.x - this.stage.x()) / oldScale,
      y: (center.y - this.stage.y()) / oldScale,
    };

    this.stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    };
    this.stage.position(newPos);
    this.stage.batchDraw();
  }

  zoomOut(): void {
    if (!this.stage) return;
    
    const oldScale = this.stage.scaleX();
    const newScale = Math.max(this.minScale, oldScale / this.scaleBy);
    
    // Zoom towards the center of the stage
    const center = {
      x: this.stage.width() / 2,
      y: this.stage.height() / 2
    };
    
    const mousePointTo = {
      x: (center.x - this.stage.x()) / oldScale,
      y: (center.y - this.stage.y()) / oldScale,
    };

    this.stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    };
    this.stage.position(newPos);
    this.stage.batchDraw();
  }

  resetView(): void {
    if (!this.stage) return;
    
    // Reset scale to 1 and center the view
    this.stage.scale({ x: 1, y: 1 });
    
    // Center the stage based on background image if available
    if (this.backgroundImage) {
      const centerX = (this.stage.width() - this.backgroundImage.width) / 2;
      const centerY = (this.stage.height() - this.backgroundImage.height) / 2;
      this.stage.position({ x: centerX, y: centerY });
    } else {
      // If no background image, just center at origin
      this.stage.position({ x: this.stage.width() / 2, y: this.stage.height() / 2 });
    }
    
    this.stage.batchDraw();
  }

  // Drag/Drop from palette handlers (bound in template on container div)
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    const { x: domX, y: domY } = this.getDomOffsetPoint(event);
    const { x, y } = this.domToStage(domX, domY);
    // Try to read dragged device info from dataTransfer (set by parent on dragstart)
    let draggedDeviceType: string | undefined;
    try {
      const raw = event.dataTransfer?.getData('text/plain');
      if (raw) {
        const parsed = JSON.parse(raw);
        draggedDeviceType = parsed?.type;
      }
    } catch (err) {
      // ignore parse errors
    }

    let foundRoomId: string | undefined;
    for (const [id, shape] of this.roomShapes.entries()) {
      if (isPointInPolygon(x, y, shape.points())) {
        foundRoomId = id;
        break;
      }
    }

    if (foundRoomId !== this.hoveredRoomId) {
      // Reset all rooms to their base appearance first
      this.clearRoomHighlight();

      if (foundRoomId) {
        const room = this.layout.rooms().find(r => r.id === foundRoomId);
        const baseColor = room?.type ? (ROOM_TYPE_COLORS[room.type] || ROOM_TYPE_COLORS.Default) : ROOM_TYPE_COLORS.Default;

        // Highlight the target room more strongly
        const targetShape = this.roomShapes.get(foundRoomId)!;
        targetShape.fill(this.hexToRgba(baseColor, 0.32));
        targetShape.stroke(baseColor);
        targetShape.strokeWidth(4);

        // Also lightly highlight other rooms of the same type (if any)
        if (room?.type) {
          const sameType = this.layout.rooms().filter(r => r.type === room.type && r.id !== foundRoomId);
          sameType.forEach(r => {
            const s = this.roomShapes.get(r.id);
            if (s) {
              s.fill(this.hexToRgba(baseColor, 0.16));
            }
          });
        }

        // If the dragged device has a type, optionally we could further filter —
        // for now we only visually indicate same-type rooms; the parent will still
        // accept the drop only on the hovered room under the pointer.
        this.drawLayer.batchDraw();
      }

      this.hoveredRoomId = foundRoomId;
      console.log(foundRoomId);
      console.log(this.hoveredRoomId);
    }
  }

  onDragLeave(_: DragEvent): void {
    this.clearRoomHighlight();
    this.hoveredRoomId = undefined;
    console.log(this.hoveredRoomId);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();

    const { x: domX, y: domY } = this.getDomOffsetPoint(event);
    const { x, y } = this.domToStage(domX, domY);

    if (!this.hoveredRoomId) {
      // Dropped outside rooms — still emit coordinates if you want free placement
      this.deviceDropped.emit({ x, y });
      this.clearRoomHighlight();
      return;
    }

    // Visual feedback: mark the room green to indicate a placed device
    const shape = this.roomShapes.get(this.hoveredRoomId)!;
    // use room type color for drop feedback
    const roomForDrop = this.layout.rooms().find(r => r.id === this.hoveredRoomId);
    const dropColor = roomForDrop?.type ? (ROOM_TYPE_COLORS[roomForDrop.type] || ROOM_TYPE_COLORS.Default) : ROOM_TYPE_COLORS.Default;
    shape.fill(this.hexToRgba(dropColor, 0.28));
    this.drawLayer.batchDraw();

    // Emit for outer component (to add device and assign to room)
    this.deviceDropped.emit({ x, y, roomId: this.hoveredRoomId });

    // ✅ Reset highlight to room type color
    this.clearRoomHighlight();

    this.hoveredRoomId = undefined;
  }

  // -----------------------
  // Internal: Konva setup
  // -----------------------
  private initStage(): void {
    const { clientWidth, clientHeight } = this.containerRef.nativeElement;

    this.stage = new Konva.Stage({
      container: this.containerRef.nativeElement,
      width: clientWidth || 1000,
      height: clientHeight || 800,
      draggable: true, // panning by default
    });

    this.imageLayer = new Konva.Layer();
    this.drawLayer = new Konva.Layer();
    this.deviceLayer = new Konva.Layer();

    this.stage.add(this.imageLayer);
    this.stage.add(this.drawLayer);
    this.stage.add(this.deviceLayer);

    // Temporary line for polygon preview
    this.tempLine = new Konva.Line({
      points: [],
      stroke: 'red',
      strokeWidth: 2,
      lineCap: 'round',
      lineJoin: 'round',
    });
    this.drawLayer.add(this.tempLine);

    // Drawing interactions
    this.stage.on('click', (evt) => {
      if (!this.drawingMode) return;

      const { x: domX, y: domY } = this.getDomOffsetPoint(evt.evt);
      const { x, y } = this.domToStage(domX, domY);

      if (this.shapeType === 'polygon') {
        this.points.push(x, y);
        this.tempLine.points(this.points);
        this.drawLayer.batchDraw();
      } else if (this.shapeType === 'rectangle') {
        if (!this.startRectPoint) {
          this.startRectPoint = { x, y };
        } else {
          const rectPoints = [
            this.startRectPoint.x, this.startRectPoint.y,
            x, this.startRectPoint.y,
            x, y,
            this.startRectPoint.x, y,
          ];
          this.createRoomFromPoints(rectPoints);
          this.disableDrawingMode();
        }
      }
    });

    this.stage.on('dblclick', () => {
      if (!this.drawingMode || this.shapeType !== 'polygon') return;
      if (this.points.length >= 6) {
        this.createRoomFromPoints([...this.points]);
        this.disableDrawingMode();
      }
    });

    // Zoom (wheel) centered at mouse position
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();

      const oldScale = this.stage.scaleX();
      const pointer = this.stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - this.stage.x()) / oldScale,
        y: (pointer.y - this.stage.y()) / oldScale,
      };

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      let newScale = direction > 0 ? oldScale * this.scaleBy : oldScale / this.scaleBy;
      newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));

      this.stage.scale({ x: newScale, y: newScale });

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
      this.stage.position(newPos);
      this.stage.batchDraw();
    });
  }

  private tryLoadBackground(): void {
    if (!this.backgroundImage) return;

    // Clear and add image
    this.imageLayer.destroyChildren();
    const konvaImage = new Konva.Image({
      image: this.backgroundImage,
      width: this.backgroundImage.width,
      height: this.backgroundImage.height,
    });
    this.imageLayer.add(konvaImage);
    this.imageLayer.batchDraw();
  }

  // Color code

  updateRoomAppearance(roomId: string, type?: string) {
    const color = type ? (ROOM_TYPE_COLORS[type] || ROOM_TYPE_COLORS.Default) : ROOM_TYPE_COLORS.Default;
    const shape = this.roomShapes.get(roomId);
    if (shape) {
      shape.fill(this.hexToRgba(color, 0.3));
      shape.stroke(color);
      this.drawLayer.batchDraw();
    }
  }

  // Public: highlight a room by id (used by sidebar clicks)
  highlightRoom(roomId: string) {
    // clear previous
    this.clearRoomHighlight();

    const shape = this.roomShapes.get(roomId);
    if (!shape) return;

  // highlight using room type color (brighter)
  const room = this.layout.rooms().find(r => r.id === roomId);
  const color = room?.type ? (ROOM_TYPE_COLORS[room.type] || ROOM_TYPE_COLORS.Default) : ROOM_TYPE_COLORS.Default;
  shape.fill(this.hexToRgba(color, 0.42));
  shape.stroke(color);
  shape.strokeWidth(4);
    this.drawLayer.batchDraw();

    this.hoveredRoomId = roomId;
  }

  // Public alias for clearing highlights (keeps existing internal method name separate)
  clearRoomHighlightPublic() {
    this.clearRoomHighlight();
  }

  // Pulse a room shape visually (used after centering) — temporary visual emphasis
  public pulseRoom(roomId: string) {
    const shape = this.roomShapes.get(roomId);
    if (!shape) return;

    const origStroke = shape.strokeWidth() || 2;
  const origFill = shape.fill();
  // if the original fill is the type-color rgba set earlier, try to compute a brighter variant
  const room = this.layout.rooms().find(r => r.id === roomId);
  const typeColor = room?.type ? (ROOM_TYPE_COLORS[room.type] || ROOM_TYPE_COLORS.Default) : ROOM_TYPE_COLORS.Default;
  const pulseBase = this.hexToRgba(typeColor, 0.6);

    // Try to increase stroke and brighten fill alpha briefly
    try {
      // brighter fill: if rgba, increase alpha; else keep
      let pulseFill = pulseBase;
      // if origFill is rgba with a different color, keep pulseBase to be consistent with type color
      if (typeof origFill === 'string' && origFill.startsWith('rgba')) {
        // try to keep the pulse color based on typeColor rather than the previous fill
        pulseFill = pulseBase;
      }

      shape.to({ strokeWidth: origStroke + 4, fill: pulseFill, duration: 0.18, easing: Konva.Easings.EaseInOut, onFinish: () => {
        shape.to({ strokeWidth: origStroke, fill: origFill, duration: 0.28, easing: Konva.Easings.EaseInOut });
      }});
    } catch (e) {
      // fail silently in case Konva operations error
      console.error('pulseRoom error', e);
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // -----------------------
  // Internal: Rooms & Devices
  // -----------------------
  private createRoomFromPoints(points: number[]) {
    const roomId = crypto.randomUUID();
    const defaultColor = ROOM_TYPE_COLORS.Default;

    const room: Room = {
      id: roomId,
      points,
      fillColor: this.hexToRgba(defaultColor, 0.3),
      strokeColor: defaultColor,
      devices: [],
    };

    const polygon = new Konva.Line({
      points: room.points,
      fill: room.fillColor,
      stroke: room.strokeColor,
      strokeWidth: 2,
      closed: true,
    });

    // Clicking the polygon should inform the parent so it can expand/select the room
    polygon.on('click', () => {
      this.roomClicked.emit(roomId);
    });

    this.drawLayer.add(polygon);
    this.roomShapes.set(roomId, polygon);

    // Emit to parent — let it decide whether to keep or discard
    this.roomCreated.emit(room);
  }

  public addDeviceMarker(x: number, y: number, name: string, roomId?: string, deviceId?: string): void { 
    const group = new Konva.Group({ x, y }); 
    group.setAttr('roomId', roomId ?? '');
    if (deviceId) group.setAttr('deviceId', deviceId);

    const marker = new Konva.Circle({ x: 0, y: 0, radius: 6, fill: 'blue', stroke: 'white', strokeWidth: 2, });
    const label = new Konva.Text({ x: 8, y: -8, text: name, fontSize: 12, fill: 'black', });

    group.add(marker); 
    group.add(label); 

    this.deviceLayer.add(group); 
    this.deviceLayer.batchDraw();
  }

  // Remove a device marker by deviceId
  removeDeviceMarker(deviceId: string) {
    const groups = this.deviceLayer.find((node: Konva.Node) =>
      node instanceof Konva.Group && node.getAttr('deviceId') === deviceId
    );

    groups.forEach(g => g.destroy());
    this.deviceLayer.batchDraw();
  }

  clearRoomHighlight() {
    // Reset appearance for all rooms to their configured base color
    for (const room of this.layout.rooms()) {
      const shape = this.roomShapes.get(room.id);
      if (shape) {
        const defaultColor = room.type ? (ROOM_TYPE_COLORS[room.type] || ROOM_TYPE_COLORS.Default) : ROOM_TYPE_COLORS.Default;
        shape.fill(this.hexToRgba(defaultColor, 0.3));
        shape.stroke(defaultColor);
        shape.strokeWidth(2);
      }
    }
    this.drawLayer.batchDraw();
    this.hoveredRoomId = undefined;
  }


  // -----------------------
  // Internal: Coordinate helpers
  // -----------------------
  // DOM offset within container (client coords -> container-local)
  private getDomOffsetPoint(evt: DragEvent | MouseEvent): { x: number; y: number } {
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  // Convert container-local DOM coords to Konva stage coords (accounting for pan/zoom)
  private domToStage(domX: number, domY: number): { x: number; y: number } {
    const scale = this.stage.scaleX() || 1;
    const pos = this.stage.position();
    return {
      x: (domX - pos.x) / scale,
      y: (domY - pos.y) / scale,
    };
  }

  // Resize stage to fit container
  private resizeStageToContainer = (): void => {
    if (!this.stage) return;
    const { clientWidth, clientHeight } = this.containerRef.nativeElement;
    if (clientWidth && clientHeight) {
      this.stage.size({ width: clientWidth, height: clientHeight });
      this.stage.batchDraw();
    }
  };

  // Remove room from the canvas
  removeRoomShape(roomId: string) {
    const shape = this.roomShapes.get(roomId);
    if (shape) {
      shape.destroy();
      this.roomShapes.delete(roomId);
      this.drawLayer.batchDraw();
    }
  }

  removeDeviceMarkersForRoom(roomId: string) {
    const groups = this.deviceLayer.find((node: Konva.Node) =>
      node instanceof Konva.Group && node.getAttr('roomId') === roomId
    );

    groups.forEach(group => group.destroy());
    this.deviceLayer.batchDraw();
  }

  // Public: clear all canvas content and reset internal state
  public clearAll(): void {
    try {
      this.imageLayer.destroyChildren();
      this.drawLayer.destroyChildren();
      this.deviceLayer.destroyChildren();
      this.roomShapes.clear();
      this.hoveredRoomId = undefined;
      // reset backgroundImage reference in the overlay (parent still owns the HTMLImageElement)
      this.backgroundImage = undefined;
      // also reset the lastLoadedImage so the background polling detects new uploads
      this.lastLoadedImage = null;
      this.stage.batchDraw();
    } catch (e) {
      console.error('clearAll error', e);
    }
  }

  // Public: clear only rooms and devices, keep background image
  public clearRoomsAndDevices(): void {
    try {
      this.drawLayer.destroyChildren();
      this.deviceLayer.destroyChildren();
      this.roomShapes.clear();
      this.hoveredRoomId = undefined;
      this.stage.batchDraw();
    } catch (e) {
      console.error('clearRoomsAndDevices error', e);
    }
  }

  loadFromLayout(layout: { rooms?: Room[]; devices?: Device[] }) {
    this.drawLayer.destroyChildren();
    this.deviceLayer.destroyChildren();
    this.roomShapes.clear();

    (layout.rooms ?? []).forEach(room => {
      const polygon = new Konva.Line({
        points: room.points ?? [],
        fill: room.fillColor || this.hexToRgba(room.strokeColor || '#000', 0.3),
        stroke: room.strokeColor || '#000',
        strokeWidth: 2,
        closed: true,
      });
      this.drawLayer.add(polygon);
      // attach click handler so parent can expand/select the room
      polygon.on('click', () => {
        this.roomClicked.emit(room.id);
      });
      this.roomShapes.set(room.id, polygon);
    });

    (layout.devices ?? []).forEach(device => {
      if (device.x !== undefined && device.y !== undefined) {
        this.addDeviceMarker(
          device.x,
          device.y,
          device.name ?? 'Device',
          device.roomId,
          device.id
        );
      }
    });

    this.stage.batchDraw();
  }


}