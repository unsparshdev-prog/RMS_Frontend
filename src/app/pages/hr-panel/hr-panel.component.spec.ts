import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HrPanelComponent } from './hr-panel.component';

describe('HrPanelComponent', () => {
  let component: HrPanelComponent;
  let fixture: ComponentFixture<HrPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HrPanelComponent]
    });
    fixture = TestBed.createComponent(HrPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
