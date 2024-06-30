import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MixedDragDropComponent } from './mixed-drag-drop.component';

describe('MixedDragDropComponent', () => {
  let component: MixedDragDropComponent;
  let fixture: ComponentFixture<MixedDragDropComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MixedDragDropComponent]
    });
    fixture = TestBed.createComponent(MixedDragDropComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
