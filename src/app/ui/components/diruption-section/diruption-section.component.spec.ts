import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiruptionSectionComponent } from './diruption-section.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('DiruptionSectionComponent', () => {
  let component: DiruptionSectionComponent;
  let fixture: ComponentFixture<DiruptionSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
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
