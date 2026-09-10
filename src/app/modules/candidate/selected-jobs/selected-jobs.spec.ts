import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectedJobs } from './selected-jobs';

describe('SelectedJobs', () => {
  let component: SelectedJobs;
  let fixture: ComponentFixture<SelectedJobs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectedJobs],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectedJobs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
