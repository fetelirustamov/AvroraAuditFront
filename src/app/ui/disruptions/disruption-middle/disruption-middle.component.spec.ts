import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisruptionMiddleComponent } from './disruption-middle.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('DisruptionMiddleComponent', () => {
  let component: DisruptionMiddleComponent;
  let fixture: ComponentFixture<DisruptionMiddleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [DisruptionMiddleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisruptionMiddleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
