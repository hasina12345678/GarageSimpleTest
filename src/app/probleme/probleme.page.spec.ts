import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProblemePage } from './probleme.page';

describe('ProblemePage', () => {
  let component: ProblemePage;
  let fixture: ComponentFixture<ProblemePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProblemePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
