import { Component, OnDestroy, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { DashboardChartsService } from './dashboard-charts.service';
import { CustomizerSettingsService } from '../../../customizer-settings/customizer-settings.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private themeSubscription?: Subscription;
  private mutationObserver?: MutationObserver;

  today = new Date();

  kpiCards = [
    {
      label: 'İstifadəçilər',
      value: 47,
      change: '+3 bu ay',
      changePositive: true,
      icon: 'group',
      color: '#6366F1',
      bgColor: 'rgba(99,102,241,0.1)',
      sparkId: 'spark_users',
      sparkData: [28, 32, 35, 38, 42, 44, 47],
      route: '/admin/permissions/user-permission'
    },
    {
      label: 'Lokasiyalar',
      value: 24,
      change: '+2 bu ay',
      changePositive: true,
      icon: 'store',
      color: '#22C55E',
      bgColor: 'rgba(34,197,94,0.1)',
      sparkId: 'spark_locs',
      sparkData: [18, 19, 20, 21, 22, 23, 24],
      route: '/admin/permissions/structure'
    },
    {
      label: 'Suallar Bankı',
      value: 186,
      change: '+12 bu həftə',
      changePositive: true,
      icon: 'quiz',
      color: '#F59E0B',
      bgColor: 'rgba(245,158,11,0.1)',
      sparkId: 'spark_quest',
      sparkData: [140, 152, 158, 165, 170, 178, 186],
      route: '/admin/questions'
    },
    {
      label: 'İzin Qrupları',
      value: 8,
      change: 'dəyişiklik yoxdur',
      changePositive: true,
      icon: 'shield',
      color: '#A78BFA',
      bgColor: 'rgba(167,139,250,0.1)',
      sparkId: 'spark_groups',
      sparkData: [6, 6, 7, 7, 7, 8, 8],
      route: '/admin/permissions/permission-groups'
    }
  ];

  quickActions = [
    {
      label: 'Market Şəbəkəsi',
      desc: 'Lokasiya strukturu idarəetməsi',
      icon: 'store',
      color: '#6366F1',
      bgColor: 'rgba(99,102,241,0.1)',
      count: '24 mağaza',
      route: '/admin/permissions/structure'
    },
    {
      label: 'İstifadəçi İcazələri',
      desc: 'İstifadəçi hüquqları',
      icon: 'manage_accounts',
      color: '#22C55E',
      bgColor: 'rgba(34,197,94,0.1)',
      count: '47 istifadəçi',
      route: '/admin/permissions/user-permission'
    },
    {
      label: 'Onay Sxemi',
      desc: 'Təsdiq axını konfiqurasiyası',
      icon: 'verified_user',
      color: '#A78BFA',
      bgColor: 'rgba(167,139,250,0.1)',
      count: '8 qrup',
      route: '/admin/permissions/permission-groups'
    },
    {
      label: 'Suallar Bankı',
      desc: 'Yoxlama suallarının idarəsi',
      icon: 'quiz',
      color: '#F59E0B',
      bgColor: 'rgba(245,158,11,0.1)',
      count: '186 sual',
      route: '/admin/questions'
    },
    {
      label: 'Kateqoriyalar',
      desc: 'Sual kateqoriyaları',
      icon: 'category',
      color: '#EF4444',
      bgColor: 'rgba(239,68,68,0.1)',
      count: '12 kateqoriya',
      route: '/admin/categories'
    }
  ];

  configItems = [
    { label: 'Lokasiyalar',   current: 24,  total: 30,  color: '#6366F1' },
    { label: 'Suallar Bankı', current: 186, total: 200, color: '#22C55E' },
    { label: 'Kateqoriyalar', current: 12,  total: 15,  color: '#F59E0B' },
    { label: 'Bölmələr',      current: 18,  total: 20,  color: '#A78BFA' },
    { label: 'Səhifələr',     current: 8,   total: 10,  color: '#EF4444' }
  ];

  recentActivity = [
    { user: 'Əli Həsənov',      action: 'yeni istifadəçi əlavə etdi',          icon: 'person_add',  color: '#22C55E', bgColor: 'rgba(34,197,94,0.1)',     time: '5 dəq əvvəl'  },
    { user: 'Aynur Qasımova',   action: 'izin qrupunu yenilədi',               icon: 'shield',      color: '#6366F1', bgColor: 'rgba(99,102,241,0.1)',    time: '23 dəq əvvəl' },
    { user: 'Rauf Əliyev',      action: 'suallar bankına 3 sual əlavə etdi',   icon: 'quiz',        color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)',    time: '1 saat əvvəl' },
    { user: 'Nigar İsmayılova', action: 'lokasiya məlumatlarını yenilədi',     icon: 'store',       color: '#A78BFA', bgColor: 'rgba(167,139,250,0.1)',   time: '3 saat əvvəl' },
    { user: 'Əli Həsənov',      action: '2 köhnə kateqoriya sildi',            icon: 'delete',      color: '#EF4444', bgColor: 'rgba(239,68,68,0.1)',     time: 'Dünən'        }
  ];

  private chartData = {
    userRoles: {
      series: [28, 12, 5, 2],
      labels: ['Auditor', 'Regional Menecer', 'Mağaza Meneceri', 'Admin']
    },
    systemActivity: {
      series: [
        { name: 'Sistem Girişi',  data: [45, 52, 60, 48, 70, 65, 80, 72, 90, 85, 95, 102] },
        { name: 'Konfiqurasiya',  data: [12, 18, 22, 15, 28, 25, 32, 30, 38, 35, 42, 48] }
      ],
      categories: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
    }
  };

  constructor(
    private charts: DashboardChartsService,
    private themeService: CustomizerSettingsService,
    @Inject(PLATFORM_ID) private platformId: any
  ) { }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.mutationObserver = new MutationObserver(() => {
        clearTimeout((this as any)._themeTimeout);
        (this as any)._themeTimeout = setTimeout(() => this.loadCharts(), 200);
      });
      this.mutationObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.loadCharts(), 50);
  }

  private async loadCharts() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.charts.destroyAll();

    try {
      await this.charts.loadUserRolesChart(
        this.chartData.userRoles.series,
        this.chartData.userRoles.labels
      );
    } catch { /* element may not exist on SSR */ }

    try {
      await this.charts.loadSystemActivityChart(
        this.chartData.systemActivity.series,
        this.chartData.systemActivity.categories
      );
    } catch { /* element may not exist on SSR */ }

    for (const kpi of this.kpiCards) {
      try {
        await this.charts.loadSparkline(kpi.sparkId, kpi.sparkData, kpi.color);
      } catch { /* continue */ }
    }
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
    this.mutationObserver?.disconnect();
    clearTimeout((this as any)._themeTimeout);
    this.charts.destroyAll();
  }
}
