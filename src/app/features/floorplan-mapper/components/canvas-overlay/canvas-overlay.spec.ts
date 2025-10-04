import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanvasOverlay } from './canvas-overlay';

describe('CanvasOverlay', () => {
  let component: CanvasOverlay;
  let fixture: ComponentFixture<CanvasOverlay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasOverlay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CanvasOverlay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
