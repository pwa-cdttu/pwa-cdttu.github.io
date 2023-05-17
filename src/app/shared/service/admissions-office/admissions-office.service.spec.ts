import { TestBed } from '@angular/core/testing';

import { AdmissionsOfficeService } from './admissions-office.service';

describe('AdmissionsOfficeService', () => {
  let service: AdmissionsOfficeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdmissionsOfficeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
