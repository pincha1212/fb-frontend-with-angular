import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScrollbarIndicatorComponent } from './scrollbar-indicator.component';

describe('ScrollbarIndicatorComponent', () => {
  let component: ScrollbarIndicatorComponent;
  let fixture: ComponentFixture<ScrollbarIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScrollbarIndicatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScrollbarIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
