import { TestBed } from '@angular/core/testing';

import { PlanService } from './plan.service';
import { appTestProviders } from '../../../testing/test-providers';

describe('PlanService', () => {
  let service: PlanService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [appTestProviders],
    });
    service = TestBed.inject(PlanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
