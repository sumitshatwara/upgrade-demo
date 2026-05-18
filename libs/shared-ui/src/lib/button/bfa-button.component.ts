import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';

export type BfaButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type BfaButtonSize = 'sm' | 'md' | 'lg';

/**
 * BofA Shared UI — Button Component (Angular Material v18 / MD3).
 *
 * Wraps Angular Material MatButton with BofA design tokens.
 * Uses CSS custom properties for theming instead of the removed
 * ThemePalette color input (MD3 migration).
 *
 * MIGRATION NOTE (Devin — Phase 3):
 *   This component is declared inside SharedUiModule (NgModule pattern).
 *   Migration target: add standalone: true, add imports: [MatButtonModule, ...].
 *   Export as a named standalone component from index.ts barrel.
 */
@Component({
  selector: 'bofa-button',
  template: `
    <button
      [attr.mat-button]="variant === 'ghost' ? '' : null"
      [attr.mat-raised-button]="variant === 'primary' ? '' : null"
      [attr.mat-stroked-button]="variant === 'secondary' ? '' : null"
      [disabled]="disabled || isLoading"
      [class]="'bofa-btn bofa-btn--' + variant + ' bofa-btn--' + size"
      [attr.aria-busy]="isLoading"
      (click)="handleClick($event)"
      type="button">
      <mat-spinner *ngIf="isLoading" diameter="16" class="bofa-btn__spinner"></mat-spinner>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    .bofa-btn--primary {
      --mdc-filled-button-container-color: var(--bofa-color-primary, #012169);
      --mdc-filled-button-label-text-color: var(--bofa-color-on-primary, #ffffff);
    }
    .bofa-btn--destructive {
      --mdc-filled-button-container-color: var(--bofa-color-error, #dc1431);
      --mdc-filled-button-label-text-color: var(--bofa-color-on-error, #ffffff);
    }
    .bofa-btn--secondary {
      --mdc-outlined-button-outline-color: var(--bofa-color-primary, #012169);
      --mdc-outlined-button-label-text-color: var(--bofa-color-primary, #012169);
    }
    .bofa-btn--ghost {
      --mdc-text-button-label-text-color: var(--bofa-color-primary, #012169);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BfaButtonComponent {
  @Input() variant: BfaButtonVariant = 'primary';
  @Input() size: BfaButtonSize = 'md';
  @Input() disabled = false;
  @Input() isLoading = false;
  @Input() ariaLabel?: string;

  @Output() bfaClick = new EventEmitter<MouseEvent>();

  handleClick(event: MouseEvent): void {
    if (!this.disabled && !this.isLoading) {
      this.bfaClick.emit(event);
    }
  }
}
