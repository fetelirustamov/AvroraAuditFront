import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuditLoadingOverlayComponent } from '../../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { ConfirmDialogService } from '../../../shared/confirm-dialog/confirm-dialog.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { UserService } from '../../../services/user.service';
import { UserDetail, UserDto } from '../../../models/user.model';
import { AdminBreadcrumbComponent } from '../../../shared/breadcrumb/admin-breadcrumb.component';
import { UserCreateComponent } from '../user-create/user-create.component';

interface UserPermission {
  id: number;
  /**
   * Users cədvəlinin real ID sütunu (DELETE /users/{id} bu dəyəri gözləyir).
   * GET /users/userdetails cavabında bu sahə qayıtmır (yalnız UserCode qayıdır),
   * ona görə GET /users siyahısından UserCode -> Id uyğunluğu ayrıca qurulur.
   * Uyğunluq tapılmasa null olur və silmə əməliyyatı bloklanır.
   */
  dbId: number | null;
  userName: string;
  /** E-poçt həm də giriş ünvanıdır — adın altında ikinci sətir kimi göstərilir */
  email: string;
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
    private notify: NotificationService,
    private userService: UserService,
    private dialog: MatDialog
  ) {
    this.dataSource = new MatTableDataSource<UserPermission>(this.users);
  }

  ngOnInit() {
    this.loadUsers();
  }

  private loadUsers() {
    this.isLoading = true;

    // GET /users/userdetails: UserCode, ad, rol, firma məlumatlarını verir, amma
    // Users cədvəlinin real ID sütununu qaytarmır.
    // GET /users: real ID + UserCode cütlüklərini verir.
    // Silmə (DELETE /users/{id}) real ID gözlədiyi üçün ikisini birləşdirib
    // UserCode -> ID uyğunluğunu burada qururuq.
    forkJoin({
      details: this.userService.getUserDetails().pipe(catchError(() => of(null))),
      all: this.userService.getAllUsers().pipe(catchError(() => of(null)))
    }).subscribe(({ details, all }) => {
      if (!details) {
        this.userDetails = [];
        this.users = [];
        this.dataSource.data = [];
        this.isLoading = false;
        this.notify.error('İstifadəçilər yüklənmədi', { message: 'Serverlə əlaqədə xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.' });
        return;
      }

      let items: UserDetail[] = [];
      const response: any = details;
      if (response && Array.isArray(response.data)) {
        items = response.data;
      } else if (response?.data?.items && Array.isArray(response.data.items)) {
        items = response.data.items;
      } else if (Array.isArray(response)) {
        items = response;
      }

      const idByUserCode = new Map<number, number>();
      const allItems: UserDto[] = Array.isArray((all as any)?.data) ? (all as any).data : [];
      for (const u of allItems) {
        if (u.userCode != null && u.id != null) {
          idByUserCode.set(u.userCode, u.id);
        }
      }

      this.userDetails = items;
      this.users = items.map((u, index) => this.mapToPermission(u, index + 1, idByUserCode));
      this.dataSource.data = this.users;
      this.isLoading = false;
    });
  }

  private mapToPermission(dto: UserDetail, index: number, idByUserCode: Map<number, number>): UserPermission {
    const nameParts = [dto.name, dto.surName, dto.fatherName].filter(Boolean);
    const fullName = nameParts.length > 0 ? nameParts.join(' ') : `ID: ${dto.userCode ?? dto.id}`;

    // API: status 1 = aktiv, 0 (və ya digər) = passiv
    const groups = dto.roleName ? [dto.roleName] : [];
    const institutions = dto.firms?.map(f => f.firmName) ?? [];

    // API 'id' field-i qaytarmır, 'userCode' istifadə edirik (siyahıda göstərmək üçün)
    const displayId = dto.userCode ?? dto.id ?? index;
    const dbId = dto.userCode != null ? (idByUserCode.get(dto.userCode) ?? null) : null;

    return {
      id: displayId,
      dbId,
      userName: fullName,
      email: dto.email ?? '',
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
    const dialogRef = this.dialog.open(UserCreateComponent, {
      width: '1100px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'modal-like-dialog'
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      this.loadUsers();
      if (result?.created && result?.userCode != null) {
        // İstifadəçi yaradıldıqdan sonra dərhal firma/rol təyinatı səhifəsinə keçirik
        this.router.navigate(['/admin/permissions/user-add'], {
          queryParams: { userId: result.userCode }
        });
      }
    });
  }

  viewUser(user: UserPermission) {
    // Hazırda UI-da "Bax" düyməsi deaktivdir (template-də comment-ə alınıb).
    // Aktivləşdiriləndə burada detal görünüşü (dialog/route) əlavə olunmalıdır.
  }

  editUser(user: UserPermission) {
    this.router.navigate(['/admin/permissions/user-add'], {
      queryParams: { userId: user.id }
    });
  }

  deleteUser(user: UserPermission) {
    if (user.dbId == null) {
      this.notify.error('İstifadəçi silinə bilmədi', {
        message: 'Bu istifadəçi üçün sistem ID-si tapılmadı (backend GET /users siyahısında uyğun qeyd yoxdur). Zəhmət olmasa backend komandası ilə əlaqə saxlayın.'
      });
      return;
    }

    this.confirmDialog.confirm({
      title: 'İstifadəçi silinsin?',
      message: `"${user.userName}" istifadəçisini silmək istədiyinizə əminsiniz?`,
      confirmText: 'Bəli, sil',
      cancelText: 'Ləğv et'
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.userService.deleteUser(user.dbId as number).subscribe({
        next: () => {
          this.notify.success('İstifadəçi silindi');
          this.loadUsers();
        },
        error: () => {
          this.notify.error('İstifadəçi silinmədi', { message: 'Serverlə əlaqədə xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.' });
        }
      });
    });
  }
}
