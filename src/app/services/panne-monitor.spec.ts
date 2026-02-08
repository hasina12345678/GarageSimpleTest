import { TestBed } from '@angular/core/testing';

import { PanneMonitorService } from './panne-monitor.service';

describe('PanneMonitorService', () => {
  let service: PanneMonitorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PanneMonitorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
