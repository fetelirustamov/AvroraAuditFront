import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisruptionDetailsComponent } from './disruption-details.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('DisruptionDetailsComponent', () => {
  let component: DisruptionDetailsComponent;
  let fixture: ComponentFixture<DisruptionDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [DisruptionDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisruptionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
