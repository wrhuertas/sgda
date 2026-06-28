import { TestBed } from '@angular/core/testing';

import { PermissionGeneralInterceptor } from './permission-general.interceptor';

describe('PermissionGeneralInterceptor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      PermissionGeneralInterceptor
      ]
  }));

  it('should be created', () => {
    const interceptor: PermissionGeneralInterceptor = TestBed.inject(PermissionGeneralInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
