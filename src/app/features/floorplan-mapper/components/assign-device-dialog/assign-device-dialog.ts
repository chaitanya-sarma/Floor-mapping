import { Component, Inject } from '@angular/core';
import { CommonModule, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-assign-device-dialog',
  standalone: true,
  imports: [CommonModule, NgStyle, FormsModule, MatButtonModule, MatCheckboxModule, MatDialogModule],
  template: `
    <h3 mat-dialog-title>Assign device</h3>
    <div mat-dialog-content class="content">
      <p class="intro">Select rooms to place <strong>{{data.deviceName}}</strong> in:</p>

      <div class="quick-actions">
        <button mat-button (click)="selectAll()">Select all</button>
        <button mat-button (click)="selectNone()">Select none</button>
      </div>

      <div class="room-list-wrap" [ngClass]="{'scrolling': (data?.sameTypeRooms || []).length > 6}">
        <div class="room-list" [ngStyle]="getRoomListStyle()">
          <label *ngFor="let r of data.sameTypeRooms; let i = index" class="room-row">
            <input type="checkbox" [(ngModel)]="selected[r.id]" />
            <span class="room-name">{{ r.name || ('Room ' + (r.id?.slice ? r.id.slice(0,6) : r.id)) }}</span>
          </label>
        </div>
        <div *ngIf="(data?.sameTypeRooms || []).length > 6" class="fade-top" aria-hidden="true"></div>
        <div *ngIf="(data?.sameTypeRooms || []).length > 6" class="fade-bottom" aria-hidden="true"></div>
      </div>
    </div>

    <div mat-dialog-actions align="end" class="actions">
      <button mat-raised-button color="primary" (click)="assign()" [disabled]="!hasSelection()">Assign</button>
      <button mat-button (click)="close()">Cancel</button>
    </div>
  `,
  styles: [
    `:host ::ng-deep .mat-dialog-content { overflow: visible; }
  :host ::ng-deep .mat-dialog-container { max-height: 80vh; }
  .content { display:flex; flex-direction:column; gap:8px; min-width:320px; max-width:560px; max-height:70vh; }
     .intro { margin:0; }
     .quick-actions { display:flex; gap:8px; margin-top:4px; }
  .room-list-wrap { position:relative; }
  .room-list { display:flex; flex-direction:column; gap:0.4rem; margin-top:0.4rem; min-height:0; }
  .fade-top, .fade-bottom { position:absolute; left:0; right:0; height:20px; pointer-events:none; z-index:5; }
  .fade-top { top:0; background: linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0)); }
  .fade-bottom { bottom:0; background: linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0)); }
     .room-row { display:flex; align-items:center; gap:0.6rem; }
     .room-name { font-weight:500; }
     .actions { display:flex; gap:0.5rem; margin-top:8px; justify-content:flex-end; }
     .actions button { min-width:120px; }
    `
  ]
})
export class AssignDeviceDialog {
  selected: Record<string, boolean> = {};

  constructor(public dialogRef: MatDialogRef<AssignDeviceDialog>, @Inject(MAT_DIALOG_DATA) public data: any) {
    (data.sameTypeRooms || []).forEach((r: any) => this.selected[r.id] = (r.id === data.targetRoomId));
  }

  hasSelection() {
    return Object.values(this.selected).some(Boolean);
  }

  assign() {
    const ids = Object.entries(this.selected).filter(([,v]) => v).map(([k]) => k);
    this.dialogRef.close(ids);
  }

  close() {
    this.dialogRef.close(null);
  }

  selectAll() {
    (this.data.sameTypeRooms || []).forEach((r: any) => this.selected[r.id] = true);
  }

  selectNone() {
    (this.data.sameTypeRooms || []).forEach((r: any) => this.selected[r.id] = false);
  }

  getRoomListStyle() {
    const count = (this.data?.sameTypeRooms || []).length || 0;
    if (count > 6) {
      return { 'height': '150px', 'overflow': 'auto' };
    }
    return { 'max-height': 'none', 'overflow': 'visible' };
  }
}
