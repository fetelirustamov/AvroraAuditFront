import { TestBed } from '@angular/core/testing';

import { DisruptionService } from './disruption.service';
import { appTestProviders } from '../../../testing/test-providers';

describe('DisruptionService', () => {
  let service: DisruptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [appTestProviders],
    });
    service = TestBed.inject(DisruptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
