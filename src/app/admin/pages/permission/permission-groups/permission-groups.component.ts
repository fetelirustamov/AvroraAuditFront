import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
import { MatDialogModule } from '@angular/material/dialog';
import { AuditLoadingOverlayComponent } from '../../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ConfirmDialogService } from '../../../shared/confirm-dialog/confirm-dialog.service';
import { RoleService } from '../../../services/role.service';
import { RoleDto } from '../../../models/role.model';
import { AdminBreadcrumbComponent } from '../../../shared/breadcrumb/admin-breadcrumb.component';

@Component({
  selector: 'app-permission-groups',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
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
    AuditLoadingOverlayComponent,
    AdminBreadcrumbComponent
  ],
  templateUrl: './permission-groups.component.html',
  styleUrl: './permission-groups.component.scss'
})
export class PermissionGroupsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['id', 'name', 'actions'];
  dataSource = new MatTableDataSource<RoleDto>();
  isLoading = false;

  constructor(
    private router: Router,
    private confirmDialog: ConfirmDialogService,
    private roleService: RoleService,
    private notify: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadRoles();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadRoles(): void {
    this.isLoading = true;
    this.roleService.getAllRoles().subscribe({
      next: res => {
        this.dataSource.data = res.data ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.notify.error('Rollar yüklənmədi');
      }
    });
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  view(row: RoleDto): void {
    this.router.navigate(['/admin/permissions/permission-groups/view', row.id]);
  }

  edit(row: RoleDto): void {
    this.router.navigate(['/admin/permissions/permission-groups/edit', row.id]);
  }

  remove(row: RoleDto): void {
    this.confirmDialog.confirm({
      title: 'İcazə qrupu silinsin?',
      message: `"${row.name}" qrupunu silmək istədiyinizə əminsiniz?`,
      confirmText: 'Sil',
      tone: 'danger'
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.roleService.deleteRole(row.id).subscribe({
        next: () => {
          this.notify.success('Qrup uğurla silindi');
          this.loadRoles();
        },
        // 409: sistem qrupu və ya istifadəçilərə təyin olunmuş qrup - səbəb serverin mesajındadır
        error: (err) => this.notify.error('Qrup silinmədi', { message: err?.error?.message || 'Silmə zamanı xəta baş verdi' })
      });
    });
  }
}
