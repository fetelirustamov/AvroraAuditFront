import { TestBed } from '@angular/core/testing';

import { DisruptionService } from './disruption.service';

describe('DisruptionService', () => {
  let service: DisruptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DisruptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
