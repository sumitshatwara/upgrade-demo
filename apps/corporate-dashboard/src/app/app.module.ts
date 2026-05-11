import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '@bofa/shared-ui';

import { AppComponent } from './app.component';
import { CorporateDashboardComponent } from './corporate-dashboard/corporate-dashboard.component';
import { WireTransferComponent } from './wire-transfer/wire-transfer.component';
import { AuditLoggingInterceptor } from './core/interceptors/audit-logging.interceptor';
import { AuthGuard } from './auth/auth.guard';

/**
 * Corporate Dashboard Root Module.
 *
 * Consumes @bofa/shared-ui via SharedUiModule (NgModule-based).
 *
 * MIGRATION TARGET (Devin — Phase 3):
 *   Convert to standalone bootstrapApplication() in main.ts.
 *   Replace HttpClientModule → provideHttpClient(withInterceptors([auditLoggingFn])).
 *   Replace RouterModule.forRoot() → provideRouter(routes).
 *   All components must declare standalone: true.
 */
@NgModule({
  declarations: [
    AppComponent,
    CorporateDashboardComponent,
    WireTransferComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    // MIGRATION TARGET: provideHttpClient() in bootstrapApplication providers
    HttpClientModule,
    SharedUiModule,
    RouterModule.forRoot([
      { path: '', redirectTo: 'corporate-dashboard', pathMatch: 'full' },
      { path: 'corporate-dashboard', component: CorporateDashboardComponent, canActivate: [AuthGuard] },
      { path: 'wire-transfer', component: WireTransferComponent, canActivate: [AuthGuard] },
      { path: '**', redirectTo: 'corporate-dashboard' }
    ])
  ],
  providers: [
    AuthGuard,
    { provide: HTTP_INTERCEPTORS, useClass: AuditLoggingInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
