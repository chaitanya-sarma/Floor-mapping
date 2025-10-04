import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloorplanMapper } from './floorplan-mapper';

describe('FloorplanMapper', () => {
  let component: FloorplanMapper;
  let fixture: ComponentFixture<FloorplanMapper>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloorplanMapper]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FloorplanMapper);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
