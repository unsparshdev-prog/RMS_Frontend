import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateData } from './candidate-data';

describe('CandidateData', () => {
  let component: CandidateData;
  let fixture: ComponentFixture<CandidateData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateData],
    }).compileComponents();

    fixture = TestBed.createComponent(CandidateData);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
