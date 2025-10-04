import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-assign-choice-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, CommonModule],
  template: `
    <h3 mat-dialog-title>Place device</h3>
    <div mat-dialog-content>
      <p>How would you like to place <strong>{{data.deviceName}}</strong>?</p>
    </div>
    <div mat-dialog-actions style="display:flex; flex-direction:column; gap:8px;">
      <button mat-raised-button color="primary" style="width:100%;" (click)="close('single')">Assign to this room</button>
      <button mat-stroked-button color="accent" style="width:100%;" (click)="close('goto-group')">Assign to all same-type rooms &#8594;</button>
      <button mat-button style="width:100%;" (click)="close('cancel')">Cancel</button>
    </div>
  `,
})
export class AssignChoiceDialog {
  constructor(public dialogRef: MatDialogRef<AssignChoiceDialog>, @Inject(MAT_DIALOG_DATA) public data: any) {}

  close(choice: string) {
    this.dialogRef.close(choice);
  }
}
