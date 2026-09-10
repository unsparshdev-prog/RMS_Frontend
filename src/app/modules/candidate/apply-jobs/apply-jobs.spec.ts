import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplyJobs } from './apply-jobs';

describe('ApplyJobs', () => {
  let component: ApplyJobs;
  let fixture: ComponentFixture<ApplyJobs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplyJobs],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplyJobs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
