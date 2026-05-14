import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { AuditLoadingOverlayComponent } from '../../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { ConfirmDialogService } from '../../../shared/confirm-dialog/confirm-dialog.service';
import { UserService } from '../../../services/user.service';
import { UserDetail } from '../../../models/user.model';
import { AdminBreadcrumbComponent } from '../../../shared/breadcrumb/admin-breadcrumb.component';

interface UserPermission {
  id: number;
  userName: string;
  institutions: string[];
  groups: string[];
  status: 'active' | 'passive';
}

@Component({
  selector: 'app-user-permission',
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
    MatChipsModule,
    MatDialogModule,
    AuditLoadingOverlayComponent,
    AdminBreadcrumbComponent
  ],
  templateUrl: './user-permission.component.html',
  styleUrl: './user-permission.component.scss'
})
export class UserPermissionComponent implements OnInit, AfterViewInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Table data
  displayedColumns: string[] = ['id', 'userName', 'institutions', 'groups', 'status', 'actions'];
  dataSource: MatTableDataSource<UserPermission>;

  // Pagination
  pageSize: number = 10;

  // Loading state
  isLoading: boolean = false;

  // Users
  users: UserPermission[] = [];
  userDetails: UserDetail[] = [];

  constructor(
    private router: Router,
    private confirmDialog: ConfirmDialogService,
    private userService: UserService
  ) {
    this.dataSource = new MatTableDataSource<UserPermission>(this.users);
  }

  ngOnInit() {
    this.loadUsers();
  }

  private loadUsers() {
    this.isLoading = true;
    this.userService.getUserDetails().subscribe({
      next: (response: any) => {
        let items: UserDetail[] = [];

        if (response && Array.isArray(response.data)) {
          items = response.data;
        } else if (response?.data?.items && Array.isArray(response.data.items)) {
          items = response.data.items;
        } else if (Array.isArray(response)) {
          items = response;
        }

        this.userDetails = items;
        this.users = items.map((u, index) => this.mapToPermission(u, index + 1));
        this.dataSource.data = this.users;
        this.isLoading = false;
      },
      error: () => {
        this.userDetails = [];
        this.users = [];
        this.dataSource.data = [];
        this.isLoading = false;
      }
    });
  }

  private mapToPermission(dto: UserDetail, index: number): UserPermission {
    const nameParts = [dto.name, dto.surName, dto.fatherName].filter(Boolean);
    const fullName = nameParts.length > 0 ? nameParts.join(' ') : `ID: ${dto.userCode ?? dto.id}`;

    // API: status 1 = aktiv, 0 (və ya digər) = passiv
    const groups = dto.roleName ? [dto.roleName] : [];
    const institutions = dto.firms?.map(f => f.firmName) ?? [];

    // API 'id' field-i qaytarmır, 'userCode' istifadə edirik
    return {
      id: dto.userCode ?? dto.id ?? index,
      userName: fullName,
      institutions,
      groups,
      status: dto.status === 1 ? 'active' : 'passive'
    };
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // Search functionality
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Page size change handler
  onPageSizeChange() {
    if (this.dataSource.paginator) {
      this.dataSource.paginator.pageSize = this.pageSize;
      this.dataSource.paginator.firstPage();
    }
  }

  // Action methods
  addNewUser() {
    this.router.navigate(['/admin/permissions/user-add']);
  }

  viewUser(user: UserPermission) {
    console.log('View user:', user);
    // Implement view functionality
  }

  editUser(user: UserPermission) {
    this.router.navigate(['/admin/permissions/user-add'], {
      queryParams: { userId: user.id }
    });
  }

  deleteUser(user: UserPermission) {
    this.confirmDialog.confirm({
      title: 'İstifadəçi silinsin?',
      message: `"${user.userName}" istifadəçisini silmək istədiyinizə əminsiniz?`,
      confirmText: 'Bəli, sil',
      cancelText: 'Ləğv et'
    }).subscribe(confirmed => {
      if (!confirmed) return;
      console.log('Delete user:', user);
      // Burada real silmə servisini çağırmaq üçün kod əlavə oluna bilər
    });
  }
}
