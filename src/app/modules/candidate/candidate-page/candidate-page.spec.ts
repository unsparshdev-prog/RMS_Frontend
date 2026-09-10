import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidatePage } from './candidate-page';

describe('CandidatePage', () => {
  let component: CandidatePage;
  let fixture: ComponentFixture<CandidatePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidatePage],
    }).compileComponents();

    fixture = TestBed.createComponent(CandidatePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
