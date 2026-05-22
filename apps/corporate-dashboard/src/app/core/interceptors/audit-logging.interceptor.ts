import { HttpInterceptorFn } from '@angular/common/http';

export const auditLoggingInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
