import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  HostBinding
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'bofa-notification-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div
      class="bofa-notification bofa-notification--{{ type }}"
      role="alert"
      [attr.aria-live]="type === 'error' ? 'assertive' : 'polite'">
      <mat-icon class="bofa-notification__icon">{{ iconMap[type] }}</mat-icon>
      <div class="bofa-notification__content">
        @if (title) {
          <span class="bofa-notification__title">{{ title }}</span>
        }
        <span class="bofa-notification__message">{{ message }}</span>
      </div>
      @if (dismissible) {
        <button
          class="bofa-notification__dismiss"
          (click)="dismiss()"
          aria-label="Dismiss notification"
          type="button">
          <mat-icon>close</mat-icon>
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BfaNotificationComponent {
  @Input() type: NotificationType = 'info';
  @Input() message = '';
  @Input() title?: string;
  @Input() dismissible = false;

  @Output() dismissed = new EventEmitter<void>();

  @HostBinding('class.bofa-notification-host') hostClass = true;
  @HostBinding('hidden') isHidden = false;

  readonly iconMap: Record<NotificationType, string> = {
    info: 'info',
    success: 'check_circle',
    warning: 'warning',
    error: 'error'
  };

  dismiss(): void {
    this.isHidden = true;
    this.dismissed.emit();
  }
}
