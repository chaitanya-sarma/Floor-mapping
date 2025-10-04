import { Component } from '@angular/core';
import { FloorplanMapper } from './features/floorplan-mapper/floorplan-mapper';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FloorplanMapper],
  template: `<app-floorplan-mapper />`,
})
export class App {}
