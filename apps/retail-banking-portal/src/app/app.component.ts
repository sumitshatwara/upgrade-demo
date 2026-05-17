import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'bofa-root',
  standalone: true,
  imports: [MatToolbarModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent {
  title = 'BofA Retail Banking Portal';
}
