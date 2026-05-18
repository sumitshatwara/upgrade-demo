import { Component } from '@angular/core';
import { SharedUiModule } from '@bofa/shared-ui';

@Component({
  selector: 'bofa-wire-transfer',
  standalone: true,
  imports: [SharedUiModule],
  template: '<h1>Wire Transfer</h1>'
})
export class WireTransferComponent {}
