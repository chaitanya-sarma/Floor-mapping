import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-reset-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Reset layout?</h2>
    <mat-dialog-content>
      <p>This will remove the uploaded image, all rooms, and devices. This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Cancel</button>
      <button mat-raised-button color="warn" (click)="dialogRef.close(true)">
        <mat-icon>refresh</mat-icon>
        Reset
      </button>
    </mat-dialog-actions>
  `
})
export class ConfirmResetDialog {
  constructor(public dialogRef: MatDialogRef<ConfirmResetDialog>) {}
}
