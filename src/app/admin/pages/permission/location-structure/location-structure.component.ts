import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { AuditLoadingOverlayComponent } from '../../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SelectionModel } from '@angular/cdk/collections';
import { forkJoin, Observable } from 'rxjs';
import { ConfirmDialogService } from '../../../shared/confirm-dialog/confirm-dialog.service';
import { FirmService } from '../../../services/firm.service';
import { LocationService } from '../../../services/location.service';
import { UserService } from '../../../services/user.service';
import { StructureService } from '../../../services/structure.service';
import { FirmDto } from '../../../models/firm.model';
import { LocationDto } from '../../../models/location.model';
import { UserDto } from '../../../models/user.model';
import { StructureDto } from '../../../models/structure.model';

interface ApprovalUser {
  id: number;              // user-in ID-si
  structureId?: number;    // API-dən qayıdan structure ID-si (update/delete üçün)
  userCode?: number;       // API-yə göndərmək üçün rəqəmsal kod
  locationCode?: number;   // PUT üçün tam model göndərmək lazım
  structureStatus?: number; // PUT üçün tam model göndərmək lazım (default: 1)
  name: string;
  code: string;
  position: string;
  order: number;           // = level (API-dəki level field-i)
  limit: number;
  budgetLimit: number;
}

@Component({
  selector: 'app-location-structure',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatDialogModule,
    AuditLoadingOverlayComponent
  ],
  templateUrl: './location-structure.component.html',
  styleUrl: './location-structure.component.scss'
})
export class LocationStructureComponent implements OnInit {

  // Data sources
  marketNetworks: FirmDto[] = [];
  allLocations: LocationDto[] = [];
  filteredLocations: LocationDto[] = [];
  allUsers: UserDto[] = [];

  // Selected values
  selectedNetwork: FirmDto | null = null;
  selectedStore: LocationDto | null = null;
  approvalUsers: ApprovalUser[] = [];

  // Table data
  displayedColumns: string[] = ['select', 'id', 'code', 'name', 'position'];
  dataSource: UserDto[] = [];
  selection = new SelectionModel<UserDto>(true, []);

  // Search filters
  searchCode: string = '';
  searchName: string = '';

  // Loading states
  isLoadingFirms: boolean = false;
  isLoadingLocations: boolean = false;
  isLoadingUsers: boolean = false;
  isLoadingStructures: boolean = false;
  isSaving: boolean = false;

  // Excel import properties
  isDragOver: boolean = false;
  uploadProgress: number = 0;
  uploadResults: any = null;

  get workspaceBusy(): boolean {
    return this.isLoadingFirms || this.isLoadingLocations || this.isLoadingUsers ||
      this.isLoadingStructures || this.isSaving;
  }

  get workspaceLoadingTitle(): string {
    if (this.isSaving) return 'Əməliyyat aparılır';
    if (this.isLoadingFirms) return 'Market şəbəkələri yüklənir';
    if (this.isLoadingLocations) return 'Mağazalar yüklənir';
    if (this.isLoadingUsers) return 'İstifadəçilər yüklənir';
    if (this.isLoadingStructures) return 'Onay sxemi yüklənir';
    return 'Yüklənir';
  }

  get workspaceLoadingHint(): string {
    if (this.isSaving) return 'Dəyişikliklər saxlanılır…';
    if (this.isLoadingFirms) return 'Şəbəkə siyahısı hazırlanır…';
    if (this.isLoadingLocations) return 'Mağaza siyahısı yenilənir…';
    if (this.isLoadingUsers) return 'İstifadəçi siyahısı yüklənir…';
    if (this.isLoadingStructures) return 'Onay sxemi məlumatları gətirilir…';
    return 'Zəhmət olmasa gözləyin…';
  }

  constructor(
    private confirmDialog: ConfirmDialogService,
    private firmService: FirmService,
    private locationService: LocationService,
    private userService: UserService,
    private structureService: StructureService,
    private notify: NotificationService
  ) { }

  ngOnInit() {
    this.loadFirms();
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  private loadFirms(): void {
    this.isLoadingFirms = true;
    this.firmService.getAllFirms().subscribe({
      next: (response: any) => {
        this.marketNetworks = this.extractArray<FirmDto>(response);
        this.isLoadingFirms = false;
      },
      error: () => {
        this.marketNetworks = [];
        this.isLoadingFirms = false;
      }
    });
  }

  private loadLocations(): void {
    this.isLoadingLocations = true;
    this.locationService.list().subscribe({
      next: (response: any) => {
        const all = this.extractArray<LocationDto>(response);
        this.allLocations = all;
        this.filteredLocations = this.selectedNetwork
          ? all.filter(l => l.firmId === this.selectedNetwork!.id)
          : [];
        this.isLoadingLocations = false;
      },
      error: () => {
        this.allLocations = [];
        this.filteredLocations = [];
        this.isLoadingLocations = false;
      }
    });
  }

  private loadUsersByFirm(firmId: number): void {
    this.isLoadingUsers = true;
    this.allUsers = [];
    this.dataSource = [];
    this.selection.clear();
    this.userService.getUsersByFirm(firmId).subscribe({
      next: (response: any) => {
        this.allUsers = this.extractArray<UserDto>(response);
        this.applyFilters();
        this.isLoadingUsers = false;
      },
      error: () => {
        this.allUsers = [];
        this.dataSource = [];
        this.isLoadingUsers = false;
      }
    });
  }

  /** API response-dan array çıxarır (müxtəlif wrapper formatlarına uyğun) */
  private extractArray<T>(response: any): T[] {
    if (response && Array.isArray(response.data)) return response.data as T[];
    if (Array.isArray(response)) return response as T[];
    if (response?.data?.items && Array.isArray(response.data.items)) return response.data.items as T[];
    return [];
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  getUserFullName(user: UserDto): string {
    const realName = [user.name, user.surName].filter(Boolean).join(' ');
    if (realName.trim()) return realName;
    const altName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    if (altName.trim()) return altName;
    return user.email || '-';
  }

  getUserCode(user: UserDto): string {
    if (user.userCode) return String(user.userCode);
    return user.email || String(user.id);
  }

  getUserPosition(user: UserDto): string {
    return user.roleName || '-';
  }

  isUserActive(user: UserDto): boolean {
    if (user.status !== undefined) return user.status === 1;
    return user.isActive === true;
  }

  // ── Selection controls ───────────────────────────────────────────────────────

  onNetworkChange(network: FirmDto) {
    this.selectedNetwork = network;
    this.selectedStore = null;
    this.approvalUsers = [];
    this.selection.clear();
    this.loadLocations();
    this.loadUsersByFirm(network.id);
  }

  onStoreChange(store: LocationDto) {
    this.selectedStore = store;
    this.approvalUsers = [];
    this.selection.clear();
    this.applyFilters();
    if (store.locationCode) {
      this.loadStructuresByLocation(store.locationCode);
    }
  }

  // ── Mağaza seçildikdə mövcud strukturları yüklə ──────────────────────────────

  private loadStructuresByLocation(locationCode: number): void {
    this.isLoadingStructures = true;
    this.structureService.getByLocationCode(locationCode).subscribe({
      next: (response: any) => {
        const structures = this.extractArray<StructureDto>(response);

        // Level-ə görə sırala
        structures.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

        // Hər strukturu ApprovalUser-ə çevir
        this.approvalUsers = structures.map(s => {
          const user = this.allUsers.find(u => u.userCode === s.userCode);
          return {
            id: user?.id ?? 0,
            structureId: s.id,
            userCode: s.userCode,
            locationCode: s.locationCode,
            structureStatus: s.status ?? 1,
            name: user ? this.getUserFullName(user) : `İstifadəçi (${s.userCode})`,
            code: user ? this.getUserCode(user) : String(s.userCode ?? ''),
            position: user ? this.getUserPosition(user) : '-',
            order: s.level ?? 1,
            limit: 1000,
            budgetLimit: 500
          };
        });

        this.isLoadingStructures = false;
      },
      error: (err) => {
        console.error('Strukturlar yüklənərkən xəta:', err);
        this.approvalUsers = [];
        this.isLoadingStructures = false;
      }
    });
  }

  getFilteredStores(): LocationDto[] {
    return this.filteredLocations;
  }

  onSearchChange() { this.applyFilters(); }

  clearFilters() {
    this.searchCode = '';
    this.searchName = '';
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.allUsers];

    if (this.searchCode.trim()) {
      const q = this.searchCode.toLowerCase().trim();
      filtered = filtered.filter(u => this.getUserCode(u).toLowerCase().includes(q));
    }

    if (this.searchName.trim()) {
      const q = this.searchName.toLowerCase().trim();
      filtered = filtered.filter(u => this.getUserFullName(u).toLowerCase().includes(q));
    }

    this.dataSource = filtered;
  }

  // ── Approval siyahısına əlavə et (POST) ─────────────────────────────────────

  addToApproval() {
    if (!this.selectedStore) {
      this.notify.warning('Zəhmət olmasa əvvəlcə mağaza seçin');
      return;
    }

    const selectedUsers = this.selection.selected;
    if (selectedUsers.length === 0) return;

    // Artıq əlavə edilməmiş userləri filtrə et
    const newUsers: ApprovalUser[] = [];
    const createRequests: Observable<any>[] = [];

    // Mövcud strukturların ən yüksək level-ini tap
    const maxExistingLevel = this.approvalUsers.length > 0
      ? Math.max(...this.approvalUsers.map(u => u.order))
      : 0;

    selectedUsers.forEach(user => {
      if (this.approvalUsers.find(au => au.id === user.id)) return;

      const level = maxExistingLevel + newUsers.length + 1;

      const approvalUser: ApprovalUser = {
        id: user.id,
        userCode: user.userCode,
        locationCode: this.selectedStore!.locationCode,
        structureStatus: 1,
        name: this.getUserFullName(user),
        code: this.getUserCode(user),
        position: this.getUserPosition(user),
        order: level,
        limit: 1000,
        budgetLimit: 500
      };
      newUsers.push(approvalUser);

      const payload: Partial<StructureDto> = {
        locationCode: this.selectedStore!.locationCode,
        userCode: user.userCode,
        level: level,
        status: 1
      };
      createRequests.push(this.structureService.create(payload));
    });

    if (newUsers.length === 0) {
      this.selection.clear();
      return;
    }

    // Optimistik UI yeniləmə
    this.approvalUsers = [...this.approvalUsers, ...newUsers];
    this.selection.clear();
    this.isSaving = true;

    forkJoin(createRequests).subscribe({
      next: (responses: any[]) => {
        // Hər user üçün API-dən qayıdan structureId-ni saxla
        responses.forEach((res, i) => {
          const created: StructureDto = res?.data?.[0] ?? res?.data ?? res;
          if (created?.id) {
            newUsers[i].structureId = created.id;
            newUsers[i].locationCode = created.locationCode ?? newUsers[i].locationCode;
            newUsers[i].structureStatus = created.status ?? newUsers[i].structureStatus ?? 1;
          }
        });
        this.isSaving = false;
        this.notify.success(`${newUsers.length} istifadəçi onay sxeminə əlavə edildi`);
      },
      error: (err) => {
        console.error('Struktur yaradılarkən xəta:', err);
        // Rollback
        const ids = new Set(newUsers.map(u => u.id));
        this.approvalUsers = this.approvalUsers.filter(au => !ids.has(au.id));
        this.isSaving = false;
        this.notify.error('Xəta baş verdi', { message: 'Əməliyyat ləğv edildi.' });
      }
    });
  }

  // ── Sıranı dəyişdir (yuxarı) → level update ─────────────────────────────────

  moveUp(user: ApprovalUser) {
    if (user.order <= 1) return;
    const prev = this.approvalUsers.find(au => au.order === user.order - 1);
    if (!prev) return;

    [user.order, prev.order] = [prev.order, user.order];
    this.approvalUsers.sort((a, b) => a.order - b.order);

    this.swapLevels(user, prev);
  }

  // ── Sıranı dəyişdir (aşağı) → level update ──────────────────────────────────

  moveDown(user: ApprovalUser) {
    if (user.order >= this.approvalUsers.length) return;
    const next = this.approvalUsers.find(au => au.order === user.order + 1);
    if (!next) return;

    [user.order, next.order] = [next.order, user.order];
    this.approvalUsers.sort((a, b) => a.order - b.order);

    this.swapLevels(user, next);
  }

  /**
   * Hər iki userin yeni levelini eyni anda API-yə göndər (forkJoin).
   * Hər ikisinin structureId-si olmalıdır.
   */
  private buildUpdatePayload(u: ApprovalUser): StructureDto {
    return {
      id: u.structureId,
      status: u.structureStatus ?? 1,
      locationCode: u.locationCode,
      userCode: u.userCode,
      level: u.order
    };
  }

  private swapLevels(a: ApprovalUser, b: ApprovalUser): void {
    const requests: { user: ApprovalUser; obs: Observable<any> }[] = [];

    [a, b].forEach(u => {
      if (!u.structureId) {
        console.warn(`${u.name} üçün structureId yoxdur — level update edilmir`);
        return;
      }
      requests.push({
        user: u,
        obs: this.structureService.update(u.structureId, this.buildUpdatePayload(u))
      });
    });

    if (requests.length === 0) return;

    forkJoin(requests.map(r => r.obs)).subscribe({
      next: () => {
        this.notify.success('Level uğurla yeniləndi');
      },
      error: (err) => {
        console.error('Level yenilənərkən xəta:', err);
        this.notify.error('Level yenilənərkən xəta baş verdi');
      }
    });
  }

  private updateStructureLevel(u: ApprovalUser): void {
    if (!u.structureId) return;
    this.structureService.update(u.structureId, this.buildUpdatePayload(u)).subscribe({
      error: (err) => console.error(`${u.name} üçün level yenilənərkən xəta:`, err)
    });
  }

  // ── İstifadəçi sil → DELETE ──────────────────────────────────────────────────

  removeUser(user: ApprovalUser) {
    this.confirmDialog.confirm({
      title: 'İstifadəçi silinsin?',
      message: `"${user.name}" istifadəçisini onay sxemindən silmək istədiyinizə əminsiniz?`,
      confirmText: 'Bəli, sil',
      cancelText: 'Ləğv et'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      const doRemove = () => {
        this.approvalUsers = this.approvalUsers.filter(au => au.id !== user.id);
        this.approvalUsers.forEach((u, i) => { u.order = i + 1; });
        // Qalan userlərin levelini API-də yenilə
        this.approvalUsers.forEach(u => this.updateStructureLevel(u));
      };

      if (user.structureId) {
        this.structureService.delete(user.structureId).subscribe({
          next: () => {
            doRemove();
            this.notify.success('İstifadəçi silindi');
          },
          error: (err) => {
            console.error('Silinərkən xəta:', err);
            this.notify.error('Xəta baş verdi');
          }
        });
      } else {
        doRemove();
      }
    });
  }

  // ── Siyahıdan çıxar (sol panel seçimindən) ──────────────────────────────────

  removeFromApproval() {
    const selectedUsers = this.selection.selected;
    if (selectedUsers.length === 0) return;

    this.approvalUsers = this.approvalUsers.filter(au =>
      !selectedUsers.find(su => su.id === au.id)
    );
    this.approvalUsers.forEach((u, i) => { u.order = i + 1; });
    this.selection.clear();
  }

  // ── Ümumi saxla düyməsi ──────────────────────────────────────────────────────

  saveChanges() {
    if (!this.selectedNetwork) {
      this.notify.warning('Zəhmət olmasa market şəbəkəsi seçin');
      return;
    }
    if (!this.selectedStore) {
      this.notify.warning('Zəhmət olmasa mağaza seçin');
      return;
    }
    if (this.approvalUsers.length === 0) {
      this.notify.warning('Onay sxeminə ən azı bir istifadəçi əlavə edin');
      return;
    }
    this.notify.success('Onay konfiqurasiyası saxlanıldı');
  }

  // ── Excel ────────────────────────────────────────────────────────────────────

  onDragOver(event: DragEvent) { event.preventDefault(); this.isDragOver = true; }
  onDragLeave(event: DragEvent) { event.preventDefault(); this.isDragOver = false; }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) this.processExcelFile(files[0]);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.processExcelFile(file);
  }

  processExcelFile(file: File) {
    this.uploadProgress = 0;
    this.uploadResults = null;
    const interval = setInterval(() => {
      this.uploadProgress += 10;
      if (this.uploadProgress >= 100) {
        clearInterval(interval);
        this.uploadProgress = 100;
        this.showUploadResults();
      }
    }, 100);
  }

  showUploadResults() {
    this.uploadResults = {
      successCount: Math.floor(Math.random() * 50) + 10,
      warningCount: Math.floor(Math.random() * 5),
      errorCount: Math.floor(Math.random() * 3)
    };
  }

  downloadTemplate() {
    const templateData = [
      ['ID', 'Ad', 'Kod', 'Vəzifə', 'Limit', 'Sıra'],
      ['1', 'İstifadəçi Adı', 'istifadeci@email.com', 'Mağaza Müdiri', '1000', '1'],
      ['2', 'İstifadəçi Adı 2', 'istifadeci2@email.com', 'Satış Məsləhətçisi', '500', '2']
    ];
    const csvContent = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'yetki_sablonu.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── Table helpers ─────────────────────────────────────────────────────────────

  trackByUserId(index: number, user: ApprovalUser): number {
    return user.id;
  }

  isAllSelected() {
    return this.selection.selected.length === this.dataSource.length && this.dataSource.length > 0;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.dataSource);
    }
  }

  checkboxLabel(row?: UserDto): string {
    if (!row) return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${this.getUserFullName(row)}`;
  }
}
