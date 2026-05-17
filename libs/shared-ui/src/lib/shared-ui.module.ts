import { NgModule } from '@angular/core';

import { BfaButtonComponent } from './button/bfa-button.component';
import { BfaDataTableComponent } from './data-table/bfa-data-table.component';
import { BfaNotificationComponent } from './notification-banner/bfa-notification.component';

/**
 * SharedUiModule — thin re-export barrel for standalone components.
 * Kept for backward compatibility during transition. Consumers should
 * import individual standalone components directly.
 */
@NgModule({
  imports: [
    BfaButtonComponent,
    BfaDataTableComponent,
    BfaNotificationComponent
  ],
  exports: [
    BfaButtonComponent,
    BfaDataTableComponent,
    BfaNotificationComponent
  ]
})
export class SharedUiModule {}
