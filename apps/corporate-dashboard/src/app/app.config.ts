import { ApplicationConfig, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { tap } from 'rxjs/operators';

import { routes } from './app.routes';

function generateCorrelationId(): string {
  return 'cid-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function sanitizeUrl(url: string): string {
  return url.replace(/\/\d{4,}/g, '/***');
}

const auditLoggingInterceptor: HttpInterceptorFn = (req, next) => {
  const correlationId = generateCorrelationId();

  const auditedReq = req.clone({
    headers: req.headers
      .set('X-Correlation-ID', correlationId)
      .set('X-Client-App', 'corporate-dashboard')
  });

  console.info(`[AUDIT] ${req.method} ${sanitizeUrl(req.url)} — CID: ${correlationId}`);

  return next(auditedReq).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        console.info(`[AUDIT] Response ${event.status} for ${req.method} ${sanitizeUrl(req.url)} — CID: ${correlationId}`);
      }
    })
  );
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([auditLoggingInterceptor])
    ),
    provideAnimationsAsync()
  ]
};
