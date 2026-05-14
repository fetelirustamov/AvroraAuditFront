import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiruptionSectionComponent } from './diruption-section.component';

describe('DiruptionSectionComponent', () => {
  let component: DiruptionSectionComponent;
  let fixture: ComponentFixture<DiruptionSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiruptionSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiruptionSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
