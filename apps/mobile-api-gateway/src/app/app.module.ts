import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '@bofa/shared-ui';

import { AppComponent } from './app.component';
import { MobileGatewayStatusComponent } from './gateway-status/mobile-gateway-status.component';
import { AuditLoggingInterceptor } from './core/interceptors/audit-logging.interceptor';

/**
 * Mobile API Gateway Root Module.
 *
 * Serves as the Angular shell for the mobile banking API gateway UI.
 * Consumes @bofa/shared-ui notification and button components.
 *
 * MIGRATION TARGET (Devin — Phase 3):
 *   Replace NgModule with standalone bootstrapApplication().
 *   HttpClientModule → provideHttpClient().
 *   SharedUiModule consumers → import individual standalone components.
 */
@NgModule({
  declarations: [
    AppComponent,
    MobileGatewayStatusComponent
  ],
  imports: [
    BrowserModule,
    // MIGRATION TARGET: provideHttpClient()
    HttpClientModule,
    SharedUiModule,
    RouterModule.forRoot([
      { path: '', component: MobileGatewayStatusComponent },
      { path: '**', redirectTo: '' }
    ])
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuditLoggingInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
