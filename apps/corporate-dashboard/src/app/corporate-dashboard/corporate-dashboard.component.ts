import { Component } from '@angular/core';
import { SharedUiModule } from '@bofa/shared-ui';

@Component({
  selector: 'bofa-corporate-dashboard',
  standalone: true,
  imports: [SharedUiModule],
  template: '<h1>Corporate Dashboard</h1>'
})
export class CorporateDashboardComponent {}
