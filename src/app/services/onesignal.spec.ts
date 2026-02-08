import { TestBed } from '@angular/core/testing';

import { Onesignal } from './onesignal.service';

describe('Onesignal', () => {
  let service: Onesignal;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Onesignal);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
