import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-room-details-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule
  ],
  template: `
    <h2 mat-dialog-title>Room Details</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Room Name</mat-label>
        <input matInput [(ngModel)]="data.name">
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Room Type</mat-label>
        <mat-select [(ngModel)]="data.type">
          <mat-option value="Lounge">Lounge</mat-option>
          <mat-option value="Meeting Room">Meeting Room</mat-option>
          <mat-option value="Office">Office</mat-option>
          <mat-option value="Washroom">Washroom</mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="dialogRef.close(data)">Save</button>
    </mat-dialog-actions>
  `
})
export class RoomDetailsDialog {
  constructor(
    public dialogRef: MatDialogRef<RoomDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { name: string; type: string }
  ) {}
}
