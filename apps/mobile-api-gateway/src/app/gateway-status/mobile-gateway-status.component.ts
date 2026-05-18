import { Component } from '@angular/core';
import { SharedUiModule } from '@bofa/shared-ui';

@Component({
  selector: 'bofa-mobile-gateway-status',
  standalone: true,
  imports: [SharedUiModule],
  template: '<h1>Mobile API Gateway Status</h1>'
})
export class MobileGatewayStatusComponent {}
