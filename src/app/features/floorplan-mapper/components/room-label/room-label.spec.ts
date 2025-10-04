import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomLabel } from './room-label';

describe('RoomLabel', () => {
  let component: RoomLabel;
  let fixture: ComponentFixture<RoomLabel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomLabel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomLabel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
