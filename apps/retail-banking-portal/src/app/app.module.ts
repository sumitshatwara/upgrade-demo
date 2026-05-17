import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TransactionListComponent } from './transactions/transaction-list.component';

// Shared-UI NgModule imports — Angular 14 pattern, not standalone
import { SharedUiModule } from '@bofa/shared-ui';

// Auth components — declared inside NgModule, not standalone
import { SsoAuthService } from './auth/sso-auth.service';
import { AuthGuard } from './auth/auth.guard';

// HTTP Interceptors
import { AuditLoggingInterceptor } from './core/interceptors/audit-logging.interceptor';

/**
 * Root application module.
 *
 * MIGRATION NOTE (Devin — Phase 3):
 *   This NgModule must be refactored to standalone components per angular-standards.md.
 *   Replace HttpClientModule with provideHttpClient() in bootstrapApplication().
 *   Remove all NgModule declarations; convert each component to standalone: true.
 *   Remove AppRoutingModule; use provideRouter() in app.config.ts instead.
 */
@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    TransactionListComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    // MIGRATION TARGET: Replace with provideHttpClient() — see angular-standards.md
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    SharedUiModule
  ],
  providers: [
    SsoAuthService,
    AuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuditLoggingInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
