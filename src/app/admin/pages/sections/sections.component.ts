import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { SectionAddComponent } from './add/section-add.component';
import { SectionDto } from '../../models/section.model';
import { SectionService } from '../../services/section.service';
import { FirmService } from '../../services/firm.service';
import { FirmDto } from '../../models/firm.model';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { AdminBreadcrumbComponent } from '../../shared/breadcrumb/admin-breadcrumb.component';
import { AuditLoadingOverlayComponent } from '../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { NotificationService } from '../../../shared/services/notification.service';

type SectionRow = SectionDto;

@Component({
  selector: 'app-sections',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    AdminBreadcrumbComponent,
    AuditLoadingOverlayComponent
  ],
  templateUrl: './sections.component.html',
  styleUrl: './sections.component.scss'
})
export class SectionsComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() showBreadcrumb = true;
  /** Verilsə, komponent bu firmaya kilidlenir ve oz firma secicisini gizledir (Audit Strukturu sehifesinden istifade ucun). */
  @Input() firmId: number | null = null;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['sectionName', 'actions'];
  dataSource: MatTableDataSource<SectionRow>;
  pageSize = 10;
  rows: SectionRow[] = [];
  allRows: SectionRow[] = [];
  firms: FirmDto[] = [];
  selectedFirmId: number | null = null;

  isLoading = false;

  constructor(
    private sectionService: SectionService,
    private firmService: FirmService,
    private confirmDialog: ConfirmDialogService,
    private dialog: MatDialog,
    private notify: NotificationService
  ) {
    this.dataSource = new MatTableDataSource<SectionRow>(this.rows);
  }

  ngOnInit(): void {
    if (this.firmId != null) {
      this.selectedFirmId = this.firmId;
    }
    this.loadFirms();
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['firmId'] && !changes['firmId'].firstChange) {
      this.selectedFirmId = this.firmId;
      this.applyFirmFilter();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private load() {
    this.isLoading = true;
    this.sectionService.list().subscribe({
      next: (response) => {
        if (response.success) {
          this.allRows = response.data as SectionDto[];
          this.applyFirmFilter();
        } else {
          this.allRows = [];
          this.rows = [];
          this.dataSource.data = [];
        }
        this.isLoading = false;
      },
      error: () => {
        this.allRows = [];
        this.rows = [];
        this.dataSource.data = [];
        this.isLoading = false;
        this.notify.error('Şöbələr yüklənmədi', { message: 'Serverlə əlaqədə xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.' });
      }
    });
  }

  private loadFirms() {
    this.firmService.getAllFirms().subscribe(response => {
      if (response.success) {
        this.firms = response.data as FirmDto[];
      }
    });
  }

  onFirmChange(): void {
    this.applyFirmFilter();
  }

  private applyFirmFilter(): void {
    const firmId = this.selectedFirmId;
    this.rows = firmId == null ? [...this.allRows] : this.allRows.filter(x => x.firmId === firmId);
    this.dataSource.data = this.rows;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  onPageSizeChange() {
    if (this.dataSource.paginator) {
      this.dataSource.paginator.pageSize = this.pageSize;
      this.dataSource.paginator.firstPage();
    }
  }

  add() {
    const dialogRef = this.dialog.open(SectionAddComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'modal-like-dialog',
      data: this.firmId != null ? { firmId: this.firmId } : undefined
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.created) this.load();
    });
  }

  edit(row: SectionRow) {
    const dialogRef = this.dialog.open(SectionAddComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'modal-like-dialog',
      data: { mode: 'edit', item: row }
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.updated) this.load();
    });
  }

  remove(row: SectionRow) {
    this.confirmDialog
      .confirm({
        title: 'Şöbə silinsin?',
        message: `"${row.sectionName}" şöbəsini silmək istədiyinizə əminsiniz?`,
        confirmText: 'Bəli, sil',
        cancelText: 'Ləğv et'
      })
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.sectionService.delete(row.id).subscribe({
          next: () => {
            this.notify.success('Şöbə silindi');
            this.load();
          },
          error: () => {
            this.notify.error('Şöbə silinmədi', { message: 'Bu şöbə istifadə olunur və ya serverlə əlaqədə xəta baş verdi.' });
          }
        });
      });
  }
}
