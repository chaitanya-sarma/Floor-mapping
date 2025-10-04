import { Component, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-image-uploader',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <button mat-raised-button color="primary" (click)="fileInput.click()">Upload Floor Plan</button>
    <input type="file" #fileInput (change)="onFileChange($event)" accept="image/*" hidden />
  `,
})
export class ImageUploader {
  @Output() imageLoaded = new EventEmitter<HTMLImageElement>();

  // expose the file input so parent can reset it
  @ViewChild('fileInput', { static: true }) fileInputRef!: ElementRef<HTMLInputElement>;

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => this.imageLoaded.emit(img);
    };
    reader.readAsDataURL(file);
  }

  // Clear the file input value so the same file can be re-uploaded immediately
  reset() {
    try {
      if (this.fileInputRef && this.fileInputRef.nativeElement) {
        this.fileInputRef.nativeElement.value = '';
      }
    } catch (err) {
      // swallow — best-effort reset
    }
  }
}