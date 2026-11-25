import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { AuditLoadingOverlayComponent } from '../../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { ImportIssue, ImportPreviewData, ImportPreviewDialogComponent, ImportPreviewRow } from './import-preview-dialog.component';
import { FileExportService, datedFileName } from '../../../../shared/services/file-export.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { FirmService } from '../../../services/firm.service';
import { LocationService } from '../../../services/location.service';
import { UserService } from '../../../services/user.service';
import { StructureService } from '../../../services/structure.service';
import { FirmDto } from '../../../models/firm.model';
import { LocationDto } from '../../../models/location.model';
import { UserDto } from '../../../models/user.model';
import { StructureChainDto, StructureDto } from '../../../models/structure.model';
import { levelRoleLabel } from '../../../../shared/utils/approval-level';
import { queryNumber, queryString, writeQueryState } from '../../../../shared/utils/query-state';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

/**
 * Sistem hesablarının e-poçt domeni. Bazada sistem/real hesabı ayırd edən sahə
 * yoxdur (`status` və `authSettingId` hamıda eynidir), ona görə bu heuristika
 * YALNIZ nişanlama və sıralama üçündür — heç kimi siyahıdan çıxarmır.
 */
const SYSTEM_ACCOUNT_EMAIL_DOMAIN = '@audit.com';

/** Ziddiyyətli rəhbər namizədi (neçə mağazada bu şəxs rəhbər kimi çıxır). */
interface SupervisorVote {
  parentCode: number;
  count: number;
  name: string;
}

/** Şəxsin zəncirdə iştirak etdiyi mağaza (istənilən pillədə). */
interface PersonChainStore {
  code: number;
  name: string;
  regionName: string;
  level: number;
  roleLabel: string;
}

/** Zəncirə əlavə siyahısının bir sətri. */
interface AddUserOption {
  userCode: number;
  name: string;
  code: string;
  position: string;
  isSystem: boolean;
}

/** İdarə etdiyi bir ərazi (mağaza). */
interface StoreRef {
  code: number;
  name: string;
  regionName: string;
}

/** İerarxiya ağacının bir düyünü — bir şəxs. */
interface PersonNode {
  userCode: number;
  name: string;
  code: string;           // sicil
  level: number;          // onay mərtəbəsi (1 = mağaza müdiri)
  roleLabel: string;
  children: PersonNode[]; // tabeçiliyindəki şəxslər
  territories: StoreRef[]; // birbaşa idarə etdiyi mağazalar (yalnız 1-ci mərtəbə)
  parentCode?: number;
}

/** Sağ paneldə bir mağazanın redaktə olunan onay zənciri. */
interface ChainMember {
  structureId?: number;
  userCode?: number;
  level: number;
  name: string;
  code: string;
  roleLabel: string;
  status: number;
}
interface StoreEditModel {
  code: number;
  name: string;
  regionName: string;
  members: ChainMember[];
  addUserCode: number | null;
  saving: boolean;
}

/** Excel idxal (wide format). */
interface ParsedImportRow { rowNumber: number; locationCode: number | null; userCodes: number[]; }
interface ImportResult { successCount: number; warningCount: number; errorCount: number; issues: ImportIssue[]; }
/** Yoxlanmış fayl: göndəriləcək zəncirlər + ötürülən sətirlər. */
interface ImportPlan { chains: StructureChainDto[]; rowOfLocation: Map<number, number>; issues: ImportIssue[]; warningCount: number; }

@Component({
  selector: 'app-location-structure',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatMenuModule,
    AuditLoadingOverlayComponent,
    PageHeaderComponent
  ],
  templateUrl: './location-structure.component.html',
  styleUrl: './location-structure.component.scss'
})
export class LocationStructureComponent implements OnInit {
  private readonly router = inject(Router);
  /** URL-də saxlanan firma (`firm`) və axtarış (`q`): səhifə yenilənəndə və link paylaşılanda iş itmir. */
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  // ── Data ──────────────────────────────────────────────────────────────────
  marketNetworks: FirmDto[] = [];
  selectedNetwork: FirmDto | null = null;
  allUsers: UserDto[] = [];
  firmLocations: LocationDto[] = [];   // seçilmiş firmanın bütün mağazaları
  private userByCode = new Map<number, UserDto>();
  private locByCode = new Map<number, LocationDto>();
  private networkStoreCodes = new Set<number>();
  /** userCode → ziddiyyətli rəhbərlər (ağacda yalnız biri görünür). */
  private parentConflicts = new Map<number, SupervisorVote[]>();
  private rawStructures: StructureDto[] = [];  // şəbəkəyə aid bütün struktur sətirləri

  // ── Ağac ──────────────────────────────────────────────────────────────────
  roots: PersonNode[] = [];
  orphans: PersonNode[] = [];
  private expanded = new Set<number>();

  // ── Seçim / detal ───────────────────────────────────────────────────────
  selectedPerson: PersonNode | null = null;
  selectedStore: StoreEditModel | null = null;

  // ── Yeni bağlantı (zənciri olmayan mağazanı bağlamaq) ──────────────────
  newBindingMode: boolean = false;
  newStoreSearch: string = '';
  /** Mağaza seçicisində "Hamısı / Boş / Bağlı" filtri. */
  newStoreFilter: 'all' | 'free' | 'bound' = 'all';
  /** Seçilən mağazanın onsuz da zənciri var idi (yeni qurulmur, redaktə olunur). */
  editingExistingChain: boolean = false;
  /** Zəncirə əlavə paneli üçün istifadəçi axtarışı. */
  addUserSearch: string = '';
  // Bir dəfə hesablanır (getter deyil) — böyük mağaza siyahısında dondurma olmasın.
  private newStoreOptions: { code: number; name: string; bound: boolean }[] = [];

  // ── UI ──────────────────────────────────────────────────────────────────
  search: string = queryString(this.query, 'q') ?? '';
  showHelp: boolean = false;
  showImport: boolean = false;

  // ── Excel ─────────────────────────────────────────────────────────────────
  isDragOver: boolean = false;
  isImporting: boolean = false;
  uploadResults: ImportResult | null = null;

  // ── Yüklənmə + diaqnostika ────────────────────────────────────────────────
  isLoadingFirms = false;
  isLoadingData = false;
  totalStructuresLoaded = 0;   // serverdən gələn ümumi struktur sayı
  scopeNote = '';              // hansı əhatə ilə süzüldü (diaqnostika)

  get workspaceBusy(): boolean { return this.isLoadingFirms || this.isLoadingData; }
  get workspaceLoadingTitle(): string {
    return this.isLoadingFirms ? 'Firmalar yüklənir' : 'Təşkilati struktur qurulur';
  }
  get workspaceLoadingHint(): string {
    return this.isLoadingFirms ? 'Firma siyahısı hazırlanır…' :'Mağazalar, istifadəçilər və bağlantılar birləşdirilir…';
  }

  constructor(
    private confirmDialog: ConfirmDialogService,
    private firmService: FirmService,
    private locationService: LocationService,
    private userService: UserService,
    private structureService: StructureService,
    private notify: NotificationService,
    private fileExport: FileExportService,
    private dialog: MatDialog,
  ) { }

  ngOnInit() { this.loadFirms(); }

  // ── Yüklənmə ──────────────────────────────────────────────────────────────
  private loadFirms(): void {
    this.isLoadingFirms = true;
    this.firmService.getAllFirms().subscribe({
      next: (r: any) => {
        this.marketNetworks = this.extractArray<FirmDto>(r);
        this.isLoadingFirms = false;
        const firm = this.marketNetworks.find(n => n.id === queryNumber(this.query, 'firm'));
        if (firm) this.onNetworkChange(firm, false);
      },
      error: (err) => {
        this.marketNetworks = []; this.isLoadingFirms = false;
        this.notify.error(apiErrorMessage(err, 'Firmalar yüklənmədi'));
      }
    });
  }

  /** `userChange`: firma əl ilə dəyişdi, axtarış sıfırlanır və URL yenilənir (URL-dən bərpada yox). */
  onNetworkChange(network: FirmDto, userChange = true) {
    this.selectedNetwork = network;
    if (userChange) {
      this.search = '';
      writeQueryState(this.router, { firm: network.id, q: null });
    }
    this.roots = [];
    this.orphans = [];
    this.expanded.clear();
    this.selectedPerson = null;
    this.selectedStore = null;
    this.uploadResults = null;
    this.loadHierarchy();
  }

  private loadHierarchy(): void {
    if (!this.selectedNetwork) return;
    const firmId = this.selectedNetwork.id;
    this.isLoadingData = true;

    // Hər çağırış müstəqil degrade olur — biri xəta versə belə qalanları göstərilir.
    forkJoin({
      locations: this.locationService.list().pipe(catchError(() => of(null))),
      users: this.userService.getUsersByFirm(firmId).pipe(catchError(() => of(null))),
      structures: this.structureService.list().pipe(catchError(() => of(null))),
    }).subscribe({
      next: (res: any) => {
        const locations = this.extractArray<LocationDto>(res.locations).filter(l => l.firmId === firmId);
        this.allUsers = this.extractArray<UserDto>(res.users);
        const structures = this.extractArray<StructureDto>(res.structures);

        this.userByCode.clear();
        this.allUsers.forEach(u => { if (u.userCode != null) this.userByCode.set(u.userCode, u); });
        // Diqqət: backend-də Location.LocationCode STRING, Structure.LocationCode INT-dir.
        // Ona görə hər yerdə rəqəmə çeviririk ki, Set/Map açarları uyğun gəlsin.
        this.firmLocations = locations;
        this.locByCode.clear();
        this.networkStoreCodes.clear();
        locations.forEach(l => {
          const code = Number(l.locationCode);
          if (!Number.isFinite(code)) return;
          this.locByCode.set(code, l);
          this.networkStoreCodes.add(code);
        });

        // ── Əhatə süzgəci (dayanıqlı) ─────────────────────────────────────
        // Əvvəl mağaza (firma lokasiyaları) üzrə süz. Boş çıxsa — firma
        // istifadəçiləri üzrə, o da boşsa bütün strukturlar (locations siyahısı
        // yarımçıq və ya firmId uyğunsuzluğu olan hallar üçün fallback).
        this.totalStructuresLoaded = structures.length;
        const firmUserCodes = new Set(this.allUsers.map(u => u.userCode).filter((c): c is number => c != null));

        const byStore = structures.filter(s => s.locationCode != null && this.networkStoreCodes.has(s.locationCode));
        const byUser = structures.filter(s => s.locationCode != null && s.userCode != null && firmUserCodes.has(s.userCode));

        if (byStore.length > 0) {
          this.rawStructures = byStore;
          this.scopeNote = '';
        } else if (byUser.length > 0) {
          this.rawStructures = byUser;
          this.scopeNote = 'Mağaza üzrə uyğunluq tapılmadı — firma istifadəçiləri üzrə göstərilir.';
        } else {
          this.rawStructures = structures.filter(s => s.locationCode != null);
          this.scopeNote = structures.length > 0
            ? 'Firma üzrə süzgəc nəticə vermədi — bütün strukturlar göstərilir.'
            : '';
        }

        this.buildTree(true);
        this.isLoadingData = false;
      },
      error: () => {
        this.rawStructures = []; this.roots = []; this.orphans = [];
        this.isLoadingData = false;
        this.notify.error('Məlumat yüklənmədi');
      }
    });
  }

  // ── Ağacın qurulması (onay zəncirlərini şəxs ağacına çevirir) ───────────────
  private buildTree(firstBuild: boolean): void {
    this.parentConflicts.clear();   // hər yenidən qurulmada sıfırlanır
    // locationCode → struktur sətirləri
    const byLoc = new Map<number, StructureDto[]>();
    for (const s of this.rawStructures) {
      const list = byLoc.get(s.locationCode!) ?? [];
      list.push(s);
      byLoc.set(s.locationCode!, list);
    }

    const nodes = new Map<number, PersonNode>();
    const parentVotes = new Map<number, Map<number, number>>();   // child → parent → say
    const territories = new Map<number, Map<number, StoreRef>>(); // owner → storeCode → ref

    const ensure = (userCode: number, pos: number): PersonNode => {
      let n = nodes.get(userCode);
      if (!n) {
        const u = this.userByCode.get(userCode);
        n = {
          userCode,
          name: u ? this.getUserFullName(u) : `İşçi (${userCode})`,
          code: u ? this.getUserCode(u) : String(userCode),
          level: pos,
          roleLabel: this.roleLabel(pos),
          children: [],
          territories: [],
        };
        nodes.set(userCode, n);
      }
      // Şəxsin rolu — çıxdığı ən yüksək mərtəbə
      if (pos > n.level) { n.level = pos; n.roleLabel = this.roleLabel(pos); }
      return n;
    };

    for (const [loc, arr] of byLoc) {
      arr.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));  // aşağıdan yuxarı
      const codes = arr.map(s => s.userCode!).filter(c => c != null);
      codes.forEach((c, i) => ensure(c, i + 1));

      // uşaq (aşağı) → valideyn (yuxarı) səsləri
      for (let i = 1; i < codes.length; i++) {
        const child = codes[i - 1], parent = codes[i];
        const votes = parentVotes.get(child) ?? new Map<number, number>();
        votes.set(parent, (votes.get(parent) ?? 0) + 1);
        parentVotes.set(child, votes);
      }

      // ərazi = 1-ci mərtəbə (mağazaya ən yaxın)
      if (codes.length > 0) {
        const owner = codes[0];
        const map = territories.get(owner) ?? new Map<number, StoreRef>();
        map.set(loc, { code: loc, name: this.storeName(loc), regionName: this.storeRegion(loc) });
        territories.set(owner, map);
      }
    }

    // valideynləri həll et + əraziləri bağla
    for (const n of nodes.values()) {
      const votes = parentVotes.get(n.userCode);
      if (votes && votes.size > 0) {
        n.parentCode = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
        // Ağac hər şəxsi BİR dəfə göstərir, ona görə şəxsin fərqli mağazalarda
        // fərqli rəhbəri varsa yalnız ən çox səs alan göstərilir, qalanları
        // itir. Bunu gizlətmək əvəzinə qeyd edib istifadəçiyə bildiririk.
        if (votes.size > 1) {
          this.parentConflicts.set(n.userCode, [...votes.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([parentCode, count]) => ({
              parentCode,
              count,
              name: this.userByCode.get(parentCode)
                ? this.getUserFullName(this.userByCode.get(parentCode)!)
                : `İşçi (${parentCode})`,
            })));
        }
      }
      const terr = territories.get(n.userCode);
      n.territories = terr ? [...terr.values()].sort((a, b) => a.name.localeCompare(b.name, 'az')) : [];
    }

    // uşaqları bağla
    for (const n of nodes.values()) {
      if (n.parentCode != null) {
        const p = nodes.get(n.parentCode);
        if (p) p.children.push(n);
      }
    }
    for (const n of nodes.values()) {
      n.children.sort((a, b) => a.name.localeCompare(b.name, 'az'));
    }

    // köklər / kimsəsizlər
    const allRoots = [...nodes.values()].filter(n => n.parentCode == null || !nodes.has(n.parentCode));
    this.orphans = allRoots
      .filter(n => n.children.length === 0 && n.territories.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'az'));
    this.roots = allRoots
      .filter(n => n.children.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'az'));

    if (firstBuild) {
      // Standart: bütün rəhbərləri (uşağı olanları) aç, yarpaqları yığ
      this.expanded = new Set([...nodes.values()].filter(n => n.children.length > 0).map(n => n.userCode));
    }

    // Seçilmiş şəxsi/mağazanı yenilə
    if (this.selectedPerson) this.selectedPerson = nodes.get(this.selectedPerson.userCode) ?? null;
    if (this.selectedStore) this.selectedStore = this.buildStoreEdit(this.selectedStore.code);
  }

  private roleLabel(level: number): string { return levelRoleLabel(level); }
  private storeName(code: number): string { return this.locByCode.get(code)?.locationName ?? `Mağaza ${code}`; }
  private storeRegion(code: number): string {
    const l = this.locByCode.get(code);
    return (l?.RegionName || l?.locationAddress || '').trim() || 'Region təyin edilməyib';
  }

  private extractArray<T>(response: any): T[] {
    if (response && Array.isArray(response.data)) return response.data as T[];
    if (Array.isArray(response)) return response as T[];
    if (response?.data?.items && Array.isArray(response.data.items)) return response.data.items as T[];
    return [];
  }

  // ── İstifadəçi helper-ləri ───────────────────────────────────────────────────
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
  getInitials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '—';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // ── KPI ──────────────────────────────────────────────────────────────────────
  private get allNodes(): PersonNode[] {
    const acc: PersonNode[] = [];
    const walk = (n: PersonNode) => { acc.push(n); n.children.forEach(walk); };
    this.roots.forEach(walk);
    this.orphans.forEach(n => acc.push(n));
    return acc;
  }
  get hasNetwork(): boolean { return !!this.selectedNetwork; }
  get countDirectors(): number { return this.allNodes.filter(n => n.level >= 3).length; }
  get countManagers(): number { return this.allNodes.filter(n => n.level === 2).length; }
  get countStoreManagers(): number { return this.allNodes.filter(n => n.level === 1).length; }
  get countBoundStores(): number { return this.networkStoreCodes.size ? this.boundStoreCount() : 0; }
  get countOrphans(): number { return this.orphans.length; }

  private boundStoreCount(): number {
    const s = new Set<number>();
    this.rawStructures.forEach(x => { if (x.locationCode != null) s.add(x.locationCode); });
    return s.size;
  }

  // Ağac panelinin nişanı. Əvvəl şablonda "{{ roots.length }} direktor" sərt
  // kodlanmışdı: kökdə Satış müdiri dayananda belə "2 direktor" yazırdı və
  // eyni ekrandakı "0 Direktor" çipi ilə ziddiyyət yaradırdı.
  get rootsBadge(): string {
    const n = this.roots.length;
    if (!n) return '0 kök';
    const labels = new Set(this.roots.map(r => r.roleLabel).filter(Boolean));
    return labels.size === 1 ? `${n} ${[...labels][0]}` : `${n} kök`;
  }

  // Axtarış zamanı nəticə sayı — əvvəl nişan tamamilə gizlənirdi, yəni
  // "neçə nəticə var?" məlumatı məhz lazım olan anda itirdi.
  get searchResultBadge(): string {
    const count = this.displayRoots.length + this.displayOrphans.length;
    return `${count} nəticə`;
  }

  // ── Ağac görünüşü + axtarış ──────────────────────────────────────────────────
  get searching(): boolean { return this.search.trim().length > 0; }

  get displayRoots(): PersonNode[] {
    if (!this.searching) return this.roots;
    return this.roots.map(r => this.pruneNode(r)).filter((n): n is PersonNode => !!n);
  }
  get displayOrphans(): PersonNode[] {
    if (!this.searching) return this.orphans;
    return this.orphans.filter(n => this.matchPerson(n) || n.territories.some(t => this.matchStore(t)));
  }

  private pruneNode(n: PersonNode): PersonNode | null {
    if (this.matchPerson(n)) return n;  // uyğun gələn şəxs bütün komandası ilə qalır
    const kids = n.children.map(c => this.pruneNode(c)).filter((x): x is PersonNode => !!x);
    const terrs = n.territories.filter(t => this.matchStore(t));
    if (kids.length || terrs.length) return { ...n, children: kids, territories: terrs };
    return null;
  }
  // Ekranda görünən hər şey axtarıla bilməlidir: ad, sicil, ROL və REGION.
  // Əvvəl rol/region axtarılmırdı — istifadəçi sətirdə gördüyü "Satış müdiri"
  // və ya "yasamal" sözünü yazanda "tapılmadı" alırdı.
  private matchPerson(n: PersonNode): boolean {
    const q = this.searchTerm;
    if (!q) return true;
    return n.name.toLowerCase().includes(q)
      || this.matchCode(n.code, q)
      || (n.roleLabel ?? '').toLowerCase().includes(q);
  }
  private matchStore(t: StoreRef): boolean {
    const q = this.searchTerm;
    if (!q) return true;
    return t.name.toLowerCase().includes(q)
      || this.matchCode(String(t.code), q)
      || (t.regionName ?? '').toLowerCase().includes(q);
  }

  private get searchTerm(): string { return this.search.trim().toLowerCase(); }

  // Kodlar üçün substring yox, PREFIKS uyğunluğu: "33" yazanda 4336/4339/4335-in
  // hamısı gəlirdi və axtarış sınıq görünürdü.
  private matchCode(code: string, q: string): boolean {
    return code.toLowerCase().startsWith(q);
  }

  hasChildrenOrTerritories(n: PersonNode): boolean {
    return n.children.length > 0 || n.territories.length > 0;
  }
  isExpanded(n: PersonNode): boolean {
    return this.searching || this.expanded.has(n.userCode);
  }
  toggleNode(n: PersonNode, event: Event) {
    event.stopPropagation();
    if (this.expanded.has(n.userCode)) this.expanded.delete(n.userCode);
    else this.expanded.add(n.userCode);
  }
  expandAll() { this.allNodes.forEach(n => { if (this.hasChildrenOrTerritories(n)) this.expanded.add(n.userCode); }); }
  collapseAll() { this.expanded.clear(); }
  clearSearch() { this.onSearchChange(''); }
  onSearchChange(value: string) {
    this.search = value;
    writeQueryState(this.router, { q: value.trim() });
  }

  trackByNode(_: number, n: PersonNode): number { return n.userCode; }
  trackByStoreRef(_: number, t: StoreRef): number { return t.code; }
  trackByMember(_: number, m: ChainMember): number { return m.structureId ?? m.userCode ?? m.level; }

  // ── Seçim ──────────────────────────────────────────────────────────────────
  selectPerson(n: PersonNode) {
    this.selectedStore = null;
    this.newBindingMode = false;
    this.selectedPerson = n;
  }
  selectStore(ref: StoreRef) {
    this.selectedPerson = null;
    this.newBindingMode = false;
    // Ağacdan gəlirsə onsuz da mövcud zəncirdir — nişan yalnız "Yeni bağlantı"
    // axınında mənalıdır, ona görə burada sıfırlanır.
    this.editingExistingChain = false;
    this.addUserSearch = '';
    this.selectedStore = this.buildStoreEdit(ref.code);
  }
  clearSelection() {
    this.selectedPerson = null; this.selectedStore = null;
    this.newBindingMode = false; this.editingExistingChain = false;
    this.addUserSearch = '';
  }

  // ── Yeni bağlantı ───────────────────────────────────────────────────────
  startNewBinding() {
    this.selectedPerson = null;
    this.selectedStore = null;
    this.newStoreSearch = '';
    this.newStoreFilter = 'all';
    this.editingExistingChain = false;
    this.newBindingMode = true;

    // Mağaza siyahısını BİR dəfə hesabla (bağlı olanlar sonda). Zəncirli
    // mağaza kodları Set-ə yığılır ki, hər sətir üçün O(1) yoxlanılsın.
    const boundCodes = new Set(this.rawStructures.map(s => s.locationCode).filter((c): c is number => c != null));
    this.newStoreOptions = this.firmLocations
      .map(l => {
        const code = Number(l.locationCode);
        return { code, name: l.locationName || `Mağaza ${code}`, bound: boundCodes.has(code) };
      })
      .filter(o => Number.isFinite(o.code))
      .sort((a, b) => (a.bound === b.bound ? a.name.localeCompare(b.name, 'az') : a.bound ? 1 : -1));
  }

  /** Axtarış + "Boş / Bağlı" filtrinə görə süzülmüş mağazalar (maks. 60 sətir). */
  get filteredNewStoreOptions(): { code: number; name: string; bound: boolean }[] {
    const q = this.newStoreSearch.trim().toLowerCase();
    let src = this.newStoreOptions;
    if (this.newStoreFilter === 'free') src = src.filter(o => !o.bound);
    else if (this.newStoreFilter === 'bound') src = src.filter(o => o.bound);
    if (q) src = src.filter(o => o.name.toLowerCase().includes(q) || String(o.code).startsWith(q));
    return src.slice(0, 60);
  }
  get newStoreTotal(): number { return this.newStoreOptions.length; }
  get freeStoreCount(): number { return this.newStoreOptions.filter(o => !o.bound).length; }
  get boundStoreOptionCount(): number { return this.newStoreOptions.filter(o => o.bound).length; }
  setNewStoreFilter(f: 'all' | 'free' | 'bound') { this.newStoreFilter = f; }

  chooseNewStore(code: number) {
    this.newBindingMode = false;
    // Seçilən mağazanın ARTIQ zənciri varmı — panel başlığı və ipucu buna görə
    // dəyişir. Əvvəl bağlı mağaza seçiləndə də "zənciri quracaqsınız" yazılırdı.
    this.editingExistingChain = this.newStoreOptions.find(o => o.code === code)?.bound ?? false;
    this.addUserSearch = '';
    this.selectedStore = this.buildStoreEdit(code);
  }

  trackByStoreCode(_: number, o: { code: number }): number { return o.code; }
  trackByUserCode(_: number, o: AddUserOption): number { return o.userCode; }

  private buildStoreEdit(code: number): StoreEditModel {
    const members = this.rawStructures
      .filter(s => s.locationCode === code)
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
      .map((s, i) => {
        const u = s.userCode != null ? this.userByCode.get(s.userCode) : undefined;
        return {
          structureId: s.id,
          userCode: s.userCode,
          level: i + 1,
          name: u ? this.getUserFullName(u) : `İşçi (${s.userCode})`,
          code: u ? this.getUserCode(u) : String(s.userCode ?? ''),
          roleLabel: this.roleLabel(i + 1),
          status: s.status ?? 1,
        } as ChainMember;
      });
    return { code, name: this.storeName(code), regionName: this.storeRegion(code), members, addUserCode: null, saving: false };
  }

  // ── Mağaza zəncirinin redaktəsi (sağ panel) ───────────────────────────────
  // ── Şəxs → mağaza zəncirləri ────────────────────────────────────────────────
  /**
   * Şəxsin iştirak etdiyi BÜTÜN mağaza zəncirləri (istənilən pillədə).
   * `territories` yalnız 1-ci pillədəki (Mağaza müdiri) mağazaları verir, ona görə
   * Satış müdiri/Direktor üçün panel boş görünürdü və onların zəncirinə çatmaq
   * üçün tabeçilikdən keçmək lazım gəlirdi.
   */
  chainStoresFor(node: PersonNode): PersonChainStore[] {
    return this.rawStructures
      .filter(s => s.userCode === node.userCode
        && s.locationCode != null
        && this.networkStoreCodes.has(s.locationCode))
      .map(s => {
        const code = s.locationCode as number;
        const level = s.level ?? 0;
        return {
          code,
          name: this.storeName(code),
          regionName: this.storeRegion(code),
          level,
          roleLabel: this.roleLabel(level),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'az'));
  }

  /** Bu şəxsin rəhbəri mağazadan-mağazaya fərqlidirsə — siyahı, yoxsa null. */
  supervisorConflict(node: PersonNode): SupervisorVote[] | null {
    return this.parentConflicts.get(node.userCode) ?? null;
  }

  /** Səhifə səviyyəsində ümumi ziddiyyət sayı. */
  get conflictCount(): number { return this.parentConflicts.size; }

  openChainStore(s: PersonChainStore) {
    this.selectStore({ code: s.code, name: s.name, regionName: s.regionName } as StoreRef);
  }
  trackByChainStore(_: number, s: PersonChainStore): number { return s.code; }

  availableUsers(store: StoreEditModel): UserDto[] {
    const used = new Set(store.members.map(m => m.userCode));
    return this.allUsers.filter(u => u.userCode != null && !used.has(u.userCode));
  }

  /**
   * Zəncirə əlavə üçün istifadəçi seçimi: axtarışla süzülür, vəzifə göstərilir,
   * sistem hesabları nişanlanıb sona atılır (gizlədilmir).
   */
  addUserOptions(store: StoreEditModel): AddUserOption[] {
    const q = this.addUserSearch.trim().toLowerCase();
    return this.availableUsers(store)
      .map(u => {
        const position = (u.position ?? '').trim();
        return {
          userCode: u.userCode as number,
          name: this.getUserFullName(u),
          code: this.getUserCode(u),
          position,
          isSystem: this.isSystemAccount(u),
        };
      })
      .filter(o => !q
        || o.name.toLowerCase().includes(q)
        || o.code.toLowerCase().startsWith(q)
        || o.position.toLowerCase().includes(q))
      .sort((a, b) =>
        a.isSystem !== b.isSystem ? (a.isSystem ? 1 : -1) : a.name.localeCompare(b.name, 'az'));
  }

  /**
   * Sistem hesabı HEURİSTİKASIDIR — bazada etibarlı göstərici yoxdur:
   * `status` və `authSettingId` bütün istifadəçilərdə eynidir (1 / "1").
   * Ona görə yalnız NİŞANLAMA və SIRALAMA üçün işlədilir; heç kimi siyahıdan
   * çıxarmır, yəni səhv müsbət nəticə heç kimi əlçatmaz etmir.
   */
  private isSystemAccount(u: UserDto): boolean {
    const position = (u.position ?? '').trim().toLowerCase();
    if (position === 'admin') return true;
    const email = (u.email ?? '').trim().toLowerCase();
    return email.endsWith(SYSTEM_ACCOUNT_EMAIL_DOMAIN);
  }

  /** Əlavə ediləcək şəxsin düşəcəyi pillə və onun rol adı. */
  nextLevel(store: StoreEditModel): number { return store.members.length + 1; }
  nextLevelLabel(store: StoreEditModel): string { return this.roleLabel(this.nextLevel(store)); }

  selectAddUser(store: StoreEditModel, code: number) {
    store.addUserCode = store.addUserCode === code ? null : code;
  }
  clearAddUserSearch() { this.addUserSearch = ''; }

  addMember(store: StoreEditModel) {
    const code = store.addUserCode;
    if (code == null) return;
    const level = store.members.length + 1;
    store.saving = true;
    this.structureService.create({ locationCode: store.code, userCode: code, level, status: 1 }).subscribe({
      next: (res: any) => {
        const created: StructureDto = res?.data?.[0] ?? res?.data ?? res;
        this.rawStructures.push({ id: created?.id, locationCode: store.code, userCode: code, level, status: 1 });
        store.addUserCode = null;
        store.saving = false;
        this.buildTree(false);
        this.notify.success('İstifadəçi zəncirə əlavə edildi');
      },
      error: (err) => { store.saving = false; this.notify.error(apiErrorMessage(err, 'Əlavə edilmədi')); }
    });
  }

  moveMember(store: StoreEditModel, member: ChainMember, dir: -1 | 1) {
    const idx = store.members.indexOf(member);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= store.members.length) return;
    const other = store.members[swapIdx];

    // level dəyərlərini dəyiş
    const raws = this.rawForStore(store.code);
    const rawA = raws.find(r => r.id === member.structureId);
    const rawB = raws.find(r => r.id === other.structureId);
    if (rawA && rawB) { const t = rawA.level; rawA.level = rawB.level; rawB.level = t; }

    store.saving = true;
    const reqs: Observable<any>[] = [];
    if (rawA?.id) reqs.push(this.structureService.update(rawA.id, this.rawPayload(rawA)));
    if (rawB?.id) reqs.push(this.structureService.update(rawB.id, this.rawPayload(rawB)));
    if (reqs.length === 0) { store.saving = false; this.buildTree(false); return; }

    forkJoin(reqs).subscribe({
      next: () => { store.saving = false; this.buildTree(false); },
      error: (err) => { store.saving = false; this.notify.error(apiErrorMessage(err, 'Sıra yenilənmədi')); this.buildTree(false); }
    });
  }

  removeMember(store: StoreEditModel, member: ChainMember) {
    this.confirmDialog.confirm({
      title: 'Şəxs təsdiq zəncirindən silinsin?',
      message: `Şəxs "${store.name}" mağazasının təsdiq zəncirindən dərhal çıxır, ondan sonrakı pillələrin nömrəsi bir azalır (2-ci pillə 1-ci olur). `
        + 'Bu mağazanın yeni uyğunsuzluqları onun təsdiqinə getməyəcək. İstifadəçinin özü silinmir; geri qaytarmaq üçün onu zəncirə yenidən əlavə edin.',
      confirmText: 'Zəncirdən sil',
      tone: 'danger',
      items: [`${member.level}. ${member.roleLabel} · ${member.name} (${member.code})`]
    }).subscribe(confirmed => {
      if (!confirmed) return;

      const finish = () => {
        this.rawStructures = this.rawStructures.filter(r => r.id !== member.structureId);
        // qalan sətirlərin level-lərini yenidən sırala
        const raws = this.rawForStore(store.code).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
        const changed: StructureDto[] = [];
        raws.forEach((r, i) => { if (r.level !== i + 1) { r.level = i + 1; changed.push(r); } });
        const reqs = changed.filter(r => r.id).map(r => this.structureService.update(r.id!, this.rawPayload(r)));
        if (reqs.length) forkJoin(reqs).subscribe({
          next: () => this.buildTree(false),
          error: (err) => { this.notify.error(apiErrorMessage(err, 'Qalan pillələrin sırası yenilənmədi')); this.buildTree(false); }
        });
        else this.buildTree(false);
        this.notify.success('İstifadəçi silindi');
      };

      if (member.structureId) {
        store.saving = true;
        this.structureService.delete(member.structureId).subscribe({
          next: () => { store.saving = false; finish(); },
          error: (err) => { store.saving = false; this.notify.error(apiErrorMessage(err, 'İstifadəçi zəncirdən silinmədi')); }
        });
      } else finish();
    });
  }

  private rawForStore(code: number): StructureDto[] {
    return this.rawStructures.filter(r => r.locationCode === code);
  }
  private rawPayload(r: StructureDto): StructureDto {
    return { id: r.id, status: r.status ?? 1, locationCode: r.locationCode, userCode: r.userCode, level: r.level };
  }

  // ── Excel idxal ──────────────────────────────────────────────────────────
  toggleImport() { this.showImport = !this.showImport; }
  toggleHelp() { this.showHelp = !this.showHelp; }

  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragOver = true; }
  onDragLeave(e: DragEvent) { e.preventDefault(); this.isDragOver = false; }
  onDrop(e: DragEvent) {
    e.preventDefault(); this.isDragOver = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) this.processExcelFile(files[0]);
  }
  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    // Eyni fayl yenidən seçiləndə də (change) hadisəsi gəlsin: ləğvdən və ya xətadan sonra
    input.value = '';
    if (f) this.processExcelFile(f);
  }

  async processExcelFile(file: File) {
    if (!this.selectedNetwork) { this.notify.error('Əvvəlcə firma seçin'); return; }
    // Ön baxışdakı "hazırkı zəncir" və mağaza/istifadəçi yoxlaması yüklənmiş strukturdan gəlir
    if (this.isLoadingData) { this.notify.warning('Struktur hələ yüklənir, bir az sonra yenidən cəhd edin'); return; }
    this.uploadResults = null;
    let parsed: ParsedImportRow[];
    try { parsed = await this.parseStructureWorkbook(file); }
    catch (err) {
      this.notify.error((err as Error)?.message || 'Excel faylı oxunmadı. Faylın .xlsx/.xls olduğunu yoxlayın.');
      return;
    }
    if (parsed.length === 0) { this.notify.warning('Faylda məlumat sətri tapılmadı'); return; }
    this.importChains(parsed);
  }

  private async parseStructureWorkbook(file: File): Promise<ParsedImportRow[]> {
    const buffer = await file.arrayBuffer();
    const grid = await this.fileExport.readSheetGrid(buffer);
    if (grid.length < 2) return [];
    const headers = (grid[0] ?? []).map(h => this.normalizeHeader(h));
    const locationIdx = headers.findIndex(h => ['magazakodu', 'locationcode', 'magaza', 'kod'].includes(h));
    if (locationIdx < 0) throw new Error('Faylda "Mağaza kodu" sütunu tapılmadı');
    const userIdxs = headers.map((header, index) => ({ header, index }))
      .filter(c => c.index !== locationIdx && c.header !== '').map(c => c.index);
    if (userIdxs.length === 0) throw new Error('Faylda istifadəçi sütunu (User 1, User 2, …) tapılmadı');
    return grid.slice(1).map((cells, i) => ({
      rowNumber: i + 2,
      locationCode: this.toNumber(cells[locationIdx]),
      userCodes: userIdxs.map(idx => this.toNumber(cells[idx])).filter((c): c is number => c !== null)
    })).filter(r => r.locationCode !== null || r.userCodes.length > 0);
  }
  private normalizeHeader(value: any): string {
    return String(value ?? '').toLowerCase()
      .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ğ/g, 'g')
      .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u')
      .replace(/[^a-z0-9]/g, '');
  }
  private toNumber(value: any): number | null {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const n = Number(String(value).trim());
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Faylı yoxlayır, ön baxış dialoqunu açır və yalnız təsdiqdən sonra göndərir.
   * Hər sətir mağazanın BÜTÜN zəncirini əvəz edir (qəsdən dağıdıcı, merge deyil).
   */
  private importChains(rows: ParsedImportRow[]): void {
    const plan = this.buildImportPlan(rows);

    if (plan.chains.length === 0) {
      this.uploadResults = { successCount: 0, warningCount: plan.warningCount, errorCount: plan.issues.length - plan.warningCount, issues: plan.issues };
      this.notify.warning('İdxal ediləcək etibarlı sətir tapılmadı');
      return;
    }

    this.dialog.open<ImportPreviewDialogComponent, ImportPreviewData, boolean>(ImportPreviewDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: {
        networkName: this.selectedNetwork?.name ?? '',
        rows: plan.chains.map(c => this.previewRow(c)),
        issues: plan.issues
      }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) this.submitChains(plan);
    });
  }

  private buildImportPlan(rows: ParsedImportRow[]): ImportPlan {
    const knownUsers = new Set(this.allUsers.map(u => u.userCode).filter(c => c != null));
    const issues: ImportIssue[] = [];
    const chains: StructureChainDto[] = [];
    const rowOfLocation = new Map<number, number>();
    let warningCount = 0;

    for (const row of rows) {
      if (row.locationCode === null) { issues.push({ row: row.rowNumber, message: 'Mağaza kodu boşdur' }); continue; }
      if (!this.networkStoreCodes.has(row.locationCode)) { issues.push({ row: row.rowNumber, message: `Mağaza kodu tapılmadı: ${row.locationCode}` }); continue; }
      if (rowOfLocation.has(row.locationCode)) { warningCount++; issues.push({ row: row.rowNumber, message: `Bu mağaza faylda təkrarlanır (sətir ${rowOfLocation.get(row.locationCode)}), ötürüldü` }); continue; }
      if (row.userCodes.length === 0) { issues.push({ row: row.rowNumber, message: 'Heç bir istifadəçi kodu göstərilməyib' }); continue; }
      const unknown = row.userCodes.filter(c => !knownUsers.has(c));
      if (unknown.length > 0) { issues.push({ row: row.rowNumber, message: `İstifadəçi kodu tapılmadı: ${unknown.join(', ')} — sətir ötürüldü` }); continue; }
      const repeated = [...new Set(row.userCodes.filter((c, i) => row.userCodes.indexOf(c) !== i))];
      if (repeated.length > 0) { issues.push({ row: row.rowNumber, message: `Eyni istifadəçi zəncirdə təkrarlanır: ${repeated.join(', ')}` }); continue; }
      rowOfLocation.set(row.locationCode, row.rowNumber);
      chains.push({ locationCode: row.locationCode, userCodes: row.userCodes });
    }

    return { chains, rowOfLocation, issues, warningCount };
  }

  /** Ön baxış sətri: səhifədə yüklənmiş hazırkı zəncir → fayldakı yeni zəncir. */
  private previewRow(chain: StructureChainDto): ImportPreviewRow {
    const currentCodes = this.rawForStore(chain.locationCode)
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
      .map(s => s.userCode)
      .filter((c): c is number => c != null);
    return {
      code: chain.locationCode,
      name: this.storeName(chain.locationCode),
      current: currentCodes.map(c => this.personLabel(c)),
      next: chain.userCodes.map(c => this.personLabel(c)),
      unchanged: currentCodes.length === chain.userCodes.length && currentCodes.every((c, i) => c === chain.userCodes[i])
    };
  }

  private personLabel(userCode: number): string {
    const u = this.userByCode.get(userCode);
    return u ? `${this.getUserFullName(u)} (${userCode})` : `İşçi (${userCode})`;
  }

  private submitChains(plan: ImportPlan): void {
    const { chains, rowOfLocation, warningCount } = plan;
    const issues = [...plan.issues];
    this.isImporting = true;
    this.structureService.replaceChains({ chains })
      .pipe(finalize(() => this.isImporting = false))
      .subscribe({
        next: (response) => {
          const result = response?.data;
          for (const failure of result?.failures ?? []) issues.push({ row: rowOfLocation.get(failure.locationCode) ?? 0, message: failure.message });
          const successCount = result?.successCount ?? 0;
          const errorCount = issues.length - warningCount;
          this.uploadResults = { successCount, warningCount, errorCount, issues };
          if (successCount > 0) { this.notify.success(`${successCount} mağazanın təsdiq zənciri yeniləndi`); this.loadHierarchy(); }
          if (errorCount > 0) this.notify.error(`${errorCount} sətir idxal edilmədi`);
        },
        error: (err) => {
          this.uploadResults = { successCount: 0, warningCount, errorCount: (issues.length - warningCount) + chains.length, issues };
          this.notify.error('İdxal alınmadı', { message: apiErrorMessage(err, 'Server xətası') });
        }
      });
  }

  downloadTemplate() {
    const rows = [['Mağaza kodu', 'User 1', 'User 2', 'User 3'], [4336, 200456, 200458, ''], [4337, 200460, '', '']];
    void this.fileExport.exportGridToExcel(rows, 'Təsdiq zəncirləri', 'tesdiq-zencirleri-sablon.xlsx');
  }

  exportCurrentStructure() {
    const byLoc = new Map<number, StructureDto[]>();
    for (const s of this.rawStructures) {
      if (s.locationCode == null) continue;
      const list = byLoc.get(s.locationCode) ?? []; list.push(s); byLoc.set(s.locationCode, list);
    }
    if (byLoc.size === 0) { this.notify.warning('İxrac ediləcək bağlantı tapılmadı'); return; }
    const chains = [...byLoc.entries()].map(([code, list]) => ({
      locationCode: code, userCodes: list.sort((a, b) => (a.level ?? 0) - (b.level ?? 0)).map(s => s.userCode)
    })).sort((a, b) => a.locationCode - b.locationCode);
    const maxSteps = Math.max(...chains.map(c => c.userCodes.length));
    const grid: unknown[][] = [['Mağaza kodu', ...Array.from({ length: maxSteps }, (_, i) => `User ${i + 1}`)]];
    for (const chain of chains) grid.push([chain.locationCode, ...Array.from({ length: maxSteps }, (_, i) => chain.userCodes[i] ?? '')]);
    void this.fileExport.exportGridToExcel(grid, 'Təsdiq zəncirləri', datedFileName('tesdiq-zencirleri', 'xlsx'));
  }
}
