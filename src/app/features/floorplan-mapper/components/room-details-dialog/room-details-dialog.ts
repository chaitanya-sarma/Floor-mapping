import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Room } from '../../../../core/models/room';

@Component({
  selector: 'app-room-details-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
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
        <input matInput [formControl]="nameFormControl" placeholder="Enter room name">
        @if (nameFormControl.hasError('required')) {
          <mat-error>Room name is <strong>required</strong></mat-error>
        }
        @if (nameFormControl.hasError('duplicate') && !nameFormControl.hasError('required')) {
          <mat-error>Room name already exists</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Room Type</mat-label>
        <mat-select [formControl]="typeFormControl">
          <mat-option value="Lounge">Lounge</mat-option>
          <mat-option value="Meeting Room">Meeting Room</mat-option>
          <mat-option value="Office">Office</mat-option>
          <mat-option value="Washroom">Washroom</mat-option>
        </mat-select>
        @if (typeFormControl.hasError('required')) {
          <mat-error>Room type is <strong>required</strong></mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!isFormValid()">Save</button>
    </mat-dialog-actions>
  `
})
export class RoomDetailsDialog {
  nameFormControl: FormControl;
  typeFormControl: FormControl;

  constructor(
    public dialogRef: MatDialogRef<RoomDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { name: string; type: string; existingRooms?: Room[]; currentRoomId?: string }
  ) {
    // Create form controls with validators
    this.nameFormControl = new FormControl(this.data.name || '', [
      Validators.required,
      this.duplicateNameValidator.bind(this)
    ]);

    this.typeFormControl = new FormControl(this.data.type || '', [
      Validators.required
    ]);
  }

  // Custom validator for duplicate room names
  private duplicateNameValidator(control: AbstractControl): ValidationErrors | null {
    const trimmedName = control.value?.trim();
    
    if (!trimmedName) {
      return null; // Let required validator handle empty values
    }

    // Check for duplicate names (exclude current room when editing)
    const isDuplicate = this.data.existingRooms?.some(room => 
      room.name?.trim().toLowerCase() === trimmedName.toLowerCase() && 
      room.id !== this.data.currentRoomId
    );

    return isDuplicate ? { duplicate: true } : null;
  }

  isFormValid(): boolean {
    return this.nameFormControl.valid && this.typeFormControl.valid;
  }

  save(): void {
    if (this.isFormValid()) {
      this.dialogRef.close({
        name: this.nameFormControl.value?.trim(),
        type: this.typeFormControl.value
      });
    }
  }
}
