import { Component, OnDestroy, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardChartsService } from './dashboard-charts.service';
import { UserService } from '../../services/user.service';
import { LocationService } from '../../services/location.service';
import { QuestionService } from '../../services/question.service';
import { CategoryService } from '../../services/category.service';
import { SectionService } from '../../services/section.service';
import { FirmService } from '../../services/firm.service';
import { RoleService } from '../../services/role.service';
import { PageService } from '../../services/page.service';
import { UserDetail } from '../../models/user.model';
import { LocationDto } from '../../models/location.model';
import { FirmDto } from '../../models/firm.model';

interface KpiCard {
  label: string;
  value: number;
  icon: string;
  route: string;
}

interface QuickAction {
  label: string;
  desc: string;
  icon: string;
  count: string;
  route: string;
}

interface SystemElement {
  label: string;
  value: number;
  icon: string;
}

/** API cavabları müxtəlif formada gələ bilir ({data:[...]}, {data:{items:[...]}}, birbaşa array) - hamısını unifikasiya edir */
function extractArray<T>(response: any): T[] {
  if (Array.isArray(response?.data)) return response.data as T[];
  if (Array.isArray(response?.data?.items)) return response.data.items as T[];
  if (Array.isArray(response)) return response as T[];
  return [];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private viewReady = false;
  private dataReady = false;

  isLoadingStats = true;

  totalUsers = 0;
  activeUsers = 0;

  kpiCards: KpiCard[] = [];
  quickActions: QuickAction[] = [];
  systemElements: SystemElement[] = [];

  private chartData = {
    userRoles: {
      series: [] as number[],
      labels: [] as string[]
    },
    locationsByFirm: {
      series: [{ name: 'Mağazalar', data: [] as number[] }],
      categories: [] as string[]
    }
  };

  constructor(
    private charts: DashboardChartsService,
    private userService: UserService,
    private locationService: LocationService,
    private questionService: QuestionService,
    private categoryService: CategoryService,
    private sectionService: SectionService,
    private firmService: FirmService,
    private roleService: RoleService,
    private pageService: PageService,
    @Inject(PLATFORM_ID) private platformId: any
  ) { }

  ngOnInit() {
    this.loadStats();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    setTimeout(() => this.tryLoadCharts(), 50);
  }

  private loadStats(): void {
    this.isLoadingStats = true;

    forkJoin({
      userDetails: this.userService.getUserDetails().pipe(catchError(() => of(null))),
      locations: this.locationService.list().pipe(catchError(() => of(null))),
      questions: this.questionService.list().pipe(catchError(() => of(null))),
      categories: this.categoryService.getAllCategories().pipe(catchError(() => of(null))),
      sections: this.sectionService.list().pipe(catchError(() => of(null))),
      firms: this.firmService.getAllFirms().pipe(catchError(() => of(null))),
      roles: this.roleService.getAllRoles().pipe(catchError(() => of(null))),
      pages: this.pageService.list().pipe(catchError(() => of([])))
    }).subscribe(({ userDetails, locations, questions, categories, sections, firms, roles, pages }) => {
      const users = extractArray<UserDetail>(userDetails);
      const locationRows = extractArray<LocationDto>(locations);
      const questionRows = extractArray<any>(questions);
      const categoryRows = extractArray<any>(categories);
      const sectionRows = extractArray<any>(sections);
      const firmRows = extractArray<FirmDto>(firms);
      const roleRows = extractArray<any>(roles);
      const pageRows = Array.isArray(pages) ? pages : [];

      this.totalUsers = users.length;
      this.activeUsers = users.filter(u => u.status === 1).length;

      this.kpiCards = [
        {
          label: 'İstifadəçilər',
          value: this.totalUsers,
          icon: 'group',
          route: '/admin/permissions/user-permission'
        },
        {
          label: 'Mağazalar',
          value: locationRows.length,
          icon: 'store',
          route: '/admin/master-data'
        },
        {
          label: 'Suallar',
          value: questionRows.length,
          icon: 'quiz',
          route: '/admin/questions'
        },
        {
          label: 'İcazə qrupları',
          value: roleRows.length,
          icon: 'shield',
          route: '/admin/permissions/permission-groups'
        }
      ];

      this.quickActions = [
        {
          label: 'Audit strukturu',
          desc: 'Firma, mağaza, şöbə və kateqoriya idarəetməsi',
          icon: 'store',
          count: `${locationRows.length} mağaza`,
          route: '/admin/master-data'
        },
        {
          label: 'İstifadəçilər',
          desc: 'İstifadəçilər və onların icazələri',
          icon: 'manage_accounts',
          count: `${this.totalUsers} istifadəçi`,
          route: '/admin/permissions/user-permission'
        },
        {
          label: 'İcazə qrupları',
          desc: 'Rol və icazə konfiqurasiyası',
          icon: 'verified_user',
          count: `${roleRows.length} qrup`,
          route: '/admin/permissions/permission-groups'
        },
        {
          label: 'Suallar',
          desc: 'Yoxlama suallarının idarəsi',
          icon: 'quiz',
          count: `${questionRows.length} sual`,
          route: '/admin/questions'
        },
        {
          label: 'Firmalar',
          desc: 'Firma qeydiyyatı',
          icon: 'domain',
          count: `${firmRows.length} firma`,
          route: '/admin/firms'
        }
      ];

      this.systemElements = [
        { label: 'Firmalar', value: firmRows.length, icon: 'domain' },
        { label: 'Mağazalar', value: locationRows.length, icon: 'store' },
        { label: 'Şöbələr', value: sectionRows.length, icon: 'apartment' },
        { label: 'Kateqoriyalar', value: categoryRows.length, icon: 'category' },
        { label: 'Suallar', value: questionRows.length, icon: 'quiz' },
        { label: 'Səhifələr', value: pageRows.length, icon: 'description' }
      ];

      // Donut: rola görə istifadəçi bölgüsü
      const roleCounts = new Map<string, number>();
      for (const u of users) {
        const roleName = u.roleName?.trim() || 'Rolsuz';
        roleCounts.set(roleName, (roleCounts.get(roleName) ?? 0) + 1);
      }
      this.chartData.userRoles = {
        series: Array.from(roleCounts.values()),
        labels: Array.from(roleCounts.keys())
      };

      // Bar: firma üzrə mağaza sayı
      const firmNameById = new Map<number, string>(firmRows.map(f => [f.id, f.name]));
      const locationCountByFirm = new Map<number, number>();
      for (const loc of locationRows) {
        locationCountByFirm.set(loc.firmId, (locationCountByFirm.get(loc.firmId) ?? 0) + 1);
      }
      const firmEntries = Array.from(locationCountByFirm.entries());
      this.chartData.locationsByFirm = {
        series: [{ name: 'Mağazalar', data: firmEntries.map(([, count]) => count) }],
        categories: firmEntries.map(([firmId]) => firmNameById.get(firmId) ?? `Firma #${firmId}`)
      };

      this.isLoadingStats = false;
      this.dataReady = true;
      this.tryLoadCharts();
    });
  }

  private tryLoadCharts(): void {
    if (!this.viewReady || !this.dataReady) return;
    this.loadCharts();
  }

  private async loadCharts() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.charts.destroyAll();

    if (this.chartData.userRoles.series.length > 0) {
      try {
        await this.charts.loadUserRolesChart(
          this.chartData.userRoles.series,
          this.chartData.userRoles.labels
        );
      } catch { /* element may not exist on SSR */ }
    }

    if (this.chartData.locationsByFirm.categories.length > 0) {
      try {
        await this.charts.loadLocationsByFirmChart(
          this.chartData.locationsByFirm.series,
          this.chartData.locationsByFirm.categories
        );
      } catch { /* element may not exist on SSR */ }
    }
  }

  ngOnDestroy(): void {
    this.charts.destroyAll();
  }
}
