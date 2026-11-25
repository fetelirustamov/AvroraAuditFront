import { Component, Input, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FirmAddComponent } from './add/firm-add.component';
import { FirmService } from '../../services/firm.service';
import { FirmDto } from '../../models/firm.model';
import { AdminBreadcrumbComponent } from '../../shared/breadcrumb/admin-breadcrumb.component';
import { AuditLoadingOverlayComponent } from '../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-firms',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    AdminBreadcrumbComponent,
    AuditLoadingOverlayComponent
  ],
  templateUrl: './firms.component.html',
  styleUrl: './firms.component.scss'
})
export class FirmsComponent implements OnInit, AfterViewInit {
  @Input() showBreadcrumb = true;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['name', 'description', 'address', 'phone', 'email', 'actions'];
  dataSource: MatTableDataSource<FirmDto>;
  pageSize = 10;

  rows: FirmDto[] = [];
  isLoading = false;

  constructor(
    private dialog: MatDialog,
    private firmService: FirmService,
    private notify: NotificationService,
    private confirmDialog: ConfirmDialogService
  ) {
    this.dataSource = new MatTableDataSource<FirmDto>(this.rows);
  }

  ngOnInit(): void {
    this.load();
  }

  private load() {
    this.isLoading = true;
    this.firmService.getAllFirms().subscribe({
      next: (response) => {
        const data = Array.isArray(response?.data) ? response.data : [];
        this.rows = data;
        this.dataSource.data = data;
        this.isLoading = false;
      },
      error: () => {
        this.rows = [];
        this.dataSource.data = [];
        this.isLoading = false;
        this.notify.error('Firmalar yüklənmədi', { message: 'Serverlə əlaqədə xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.' });
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
    const dialogRef = this.dialog.open(FirmAddComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'modal-like-dialog'
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.created) this.load();
    });
  }

  edit(row: FirmDto) {
    const dialogRef = this.dialog.open(FirmAddComponent, {
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

  remove(row: FirmDto) {
    this.confirmDialog
      .confirm({
        title: 'Firma silinsin?',
        message: `"${row.name}" firmasını silmək istədiyinizə əminsiniz? Planları və hesabatları qalır, firma siyahılardan çıxır.`,
        confirmText: 'Sil',
        tone: 'danger'
      })
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.firmService.deleteFirm(row.id).subscribe({
          next: () => {
            this.notify.success('Firma silindi');
            this.load();
          },
          // 409: firmaya bağlı aktiv mağaza, şöbə və ya istifadəçi var - səbəb serverin mesajındadır
          error: (err) => this.notify.error('Firma silinmədi', { message: err?.error?.message || 'Serverlə əlaqədə xəta baş verdi.' })
        });
      });
  }
}
