import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';

import { BfaButtonComponent } from './button/bfa-button.component';
import { BfaDataTableComponent } from './data-table/bfa-data-table.component';
import { BfaNotificationComponent } from './notification-banner/bfa-notification.component';

/**
 * SharedUiModule — Angular 14 NgModule wrapper for all shared UI components.
 *
 * MIGRATION TARGET (Devin — Phase 3):
 *   This module becomes a thin re-export barrel after components go standalone.
 *   Consumers will eventually import BfaButtonComponent directly rather than
 *   importing SharedUiModule. Keep this module during transition period only.
 */
@NgModule({
  declarations: [
    BfaButtonComponent,
    BfaDataTableComponent,
    BfaNotificationComponent
  ],
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule
  ],
  exports: [
    BfaButtonComponent,
    BfaDataTableComponent,
    BfaNotificationComponent
  ]
})
export class SharedUiModule {}
