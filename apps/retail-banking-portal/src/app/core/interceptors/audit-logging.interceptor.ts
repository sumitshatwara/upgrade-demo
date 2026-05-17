import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SsoAuthService } from '../../auth/sso-auth.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuditLoggingInterceptor implements HttpInterceptor {

  constructor(private authService: SsoAuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken ? this.authService.getToken() : null;
    const correlationId = token ? this.extractCorrelationId(token) : this.generateCorrelationId();

    const auditedReq = req.clone({
      headers: req.headers
        .set('X-Correlation-ID', correlationId)
        .set('X-Client-App', environment.appName)
    });

    console.info(`[AUDIT] ${req.method} ${this.sanitizeUrl(req.url)} — CID: ${correlationId}`);

    return next.handle(auditedReq).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          console.info(`[AUDIT] Response ${event.status} for ${req.method} ${this.sanitizeUrl(req.url)} — CID: ${correlationId}`);
        }
      })
    );
  }

  private extractCorrelationId(token: string): string {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sessionIndex || this.generateCorrelationId();
    } catch {
      return this.generateCorrelationId();
    }
  }

  private generateCorrelationId(): string {
    return 'cid-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  private sanitizeUrl(url: string): string {
    return url.replace(/\/\d{4,}/g, '/***');
  }
}
