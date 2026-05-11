import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  OnInit,
  AfterViewInit,
  ChangeDetectionStrategy
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, Sort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any, row: T) => string;
}

/**
 * BofA Shared Data Table — wraps Angular Material v14 mat-table with sort.
 *
 * ─────────────────────────────────────────────────────────────────────
 * ANGULAR MATERIAL v14 SORT BINDING (current — deprecated in v18):
 *
 *   <mat-table
 *     [dataSource]="dataSource"
 *     matSort
 *     [matSortActive]="initialSortColumn"
 *     [matSortDirection]="initialSortDirection"
 *     (matSortChange)="onSortChange($event)">
 *
 *   matSortActive and matSortDirection are INPUT bindings on the mat-table
 *   host element in v14. They are NOT the same as the MatSort directive
 *   properties in v18.
 * ─────────────────────────────────────────────────────────────────────
 *
 * MIGRATION NOTE (Devin — Phase 5 — Angular Material v14 → v18):
 *   In Angular Material v18, [matSortActive] and [matSortDirection] inputs
 *   were removed from mat-table. Initialize sort state directly on MatSort:
 *
 *     // AfterViewInit:
 *     this.sort.active = 'transactionDate';
 *     this.sort.direction = 'desc';
 *     this.sort.sortChange.emit();
 *
 *   The (matSortChange) event type changes from Sort → SortState in v18.
 *   MatSortModule must be explicitly imported in standalone components.
 *   'legacy' form field appearance is removed — replace with 'outline'.
 *
 * MIGRATION NOTE (Devin — Phase 3):
 *   Add standalone: true with imports: [MatTableModule, MatSortModule,
 *   MatPaginatorModule, CommonModule, MatIconModule].
 */
@Component({
  selector: 'bofa-data-table',
  // NOT standalone — declared in SharedUiModule
  template: `
    <div class="bofa-table-wrapper" [class.bofa-table--loading]="isLoading">
      <table
        mat-table
        [dataSource]="dataSource"
        matSort
        [matSortActive]="initialSortColumn"
        [matSortDirection]="initialSortDirection"
        (matSortChange)="onSortChange($event)"
        [attr.aria-label]="ariaLabel"
        class="bofa-data-table">

        <ng-container *ngFor="let col of columns" [matColumnDef]="col.key">
          <th
            mat-header-cell
            *matHeaderCellDef
            [mat-sort-header]="col.sortable ? col.key : ''"
            [disabled]="!col.sortable"
            [style.width]="col.width"
            [style.text-align]="col.align || 'left'">
            {{ col.header }}
          </th>
          <td
            mat-cell
            *matCellDef="let row"
            [style.text-align]="col.align || 'left'">
            {{ col.formatter ? col.formatter(row[col.key], row) : row[col.key] }}
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let row">
            <ng-container *ngTemplateOutlet="actionsTemplate; context: { $implicit: row }">
            </ng-container>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
        <tr
          mat-row
          *matRowDef="let row; columns: displayedColumns"
          [class.bofa-table__row--selected]="row === selectedRow"
          (click)="selectRow(row)">
        </tr>

        <tr class="mat-row" *matNoDataRow>
          <td class="mat-cell bofa-table__empty" [attr.colspan]="displayedColumns.length">
            <div class="bofa-table__empty-state">
              <span>No records found</span>
            </div>
          </td>
        </tr>
      </table>

      <mat-paginator
        *ngIf="showPaginator"
        [length]="totalCount"
        [pageSize]="pageSize"
        [pageSizeOptions]="[10, 25, 50, 100]"
        (page)="onPageChange($event)"
        showFirstLastButtons
        aria-label="Select page">
      </mat-paginator>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BfaDataTableComponent implements OnInit, AfterViewInit {
  @Input() columns: TableColumn[] = [];
  @Input() dataSource = new MatTableDataSource<any>([]);
  @Input() displayedColumns: string[] = [];
  @Input() totalCount = 0;
  @Input() pageSize = 25;
  @Input() isLoading = false;
  @Input() showPaginator = true;
  @Input() ariaLabel = 'Data table';
  @Input() actionsTemplate: any;

  // Angular Material v14 sort binding inputs — see migration note above
  @Input() initialSortColumn = '';
  @Input() initialSortDirection: 'asc' | 'desc' | '' = 'desc';

  @Output() sortChange = new EventEmitter<Sort>();
  @Output() pageChange = new EventEmitter<any>();
  @Output() rowSelect = new EventEmitter<any>();

  @ViewChild(MatSort, { static: false }) sort!: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;

  selectedRow: any = null;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (this.sort) this.dataSource.sort = this.sort;
    if (this.paginator) this.dataSource.paginator = this.paginator;
  }

  onSortChange(sort: Sort): void {
    this.sortChange.emit(sort);
  }

  onPageChange(event: any): void {
    this.pageChange.emit(event);
  }

  selectRow(row: any): void {
    this.selectedRow = this.selectedRow === row ? null : row;
    this.rowSelect.emit(this.selectedRow);
  }
}
