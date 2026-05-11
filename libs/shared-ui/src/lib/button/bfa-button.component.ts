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
 * BofA Shared UI — Button Component (Angular Material v14).
 *
 * Wraps Angular Material v14 MatButton with BofA design tokens.
 *
 * MIGRATION NOTE (Devin — Phase 3):
 *   This component is declared inside SharedUiModule (NgModule pattern).
 *   Migration target: add standalone: true, add imports: [MatButtonModule, ...].
 *   Export as a named standalone component from index.ts barrel.
 *
 * MIGRATION NOTE (Devin — Phase 5):
 *   Angular Material v18 changed mat-button color input — 'primary' color
 *   is no longer a valid ThemePalette. Use custom CSS classes with
 *   Material Design 3 tokens instead. See Angular Material v18 migration guide.
 */
@Component({
  selector: 'bofa-button',
  // NOT standalone — declared in SharedUiModule
  // standalone: true  ← add in Phase 3
  template: `
    <button
      [attr.mat-button]="variant === 'ghost' ? '' : null"
      [attr.mat-raised-button]="variant === 'primary' ? '' : null"
      [attr.mat-stroked-button]="variant === 'secondary' ? '' : null"
      [color]="variant === 'primary' ? 'primary' : variant === 'destructive' ? 'warn' : undefined"
      [disabled]="disabled || isLoading"
      [class]="'bofa-btn bofa-btn--' + variant + ' bofa-btn--' + size"
      [attr.aria-busy]="isLoading"
      (click)="handleClick($event)"
      type="button">
      <mat-spinner *ngIf="isLoading" diameter="16" class="bofa-btn__spinner"></mat-spinner>
      <ng-content></ng-content>
    </button>
  `,
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
