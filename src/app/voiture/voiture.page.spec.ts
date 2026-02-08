import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VoiturePage } from './voiture.page';

describe('VoiturePage', () => {
  let component: VoiturePage;
  let fixture: ComponentFixture<VoiturePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VoiturePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
