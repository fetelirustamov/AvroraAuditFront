import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import {
  CalendarApi,
  CalendarOptions,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventInput,
  EventMountArg,
  EventSourceFunc,
} from '@fullcalendar/core';
import azLocale from '@fullcalendar/core/locales/az';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import { NotificationService } from '../../../shared/services/notification.service';
import { isoDateAddDays, toBakuDisplay, toBakuWallClock } from '../../../shared/utils/date.util';
import { TableState } from '../../../models/table-state.model';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { TableService } from '../../services/table.service';
import { PlanDetails } from '../plan.model';

interface PlanStatusOption {
  value: number;
  label: string;
  color: string;
}

/** Bir günün status bölgüsü — ay görünüşündəki xülasə çipini qidalandırır. */
interface DayStatusCount {
  label: string;
  color: string;
  count: number;
}

/** Yan paneldə göstərilən bir plan sətri. */
export interface DayPlanRow {
  id: number;
  locationName: string;
  locationCode: number;
  inspectorsName: string;
  statusLabel: string;
  statusColor: string;
  timeRange: string;
}

/** Bir sorğuda gətirilən maksimum plan sayı — bundan çoxu üçün istifadəçiyə xəbərdarlıq göstərilir. */
const MAX_ROWS = 1000;
const FALLBACK_COLOR = '#6B7280';

// Chrome-un ICU məlumatında Azərbaycan ay/gün adları yoxdur (Intl('az') "2026 M09" verir),
// ona görə təqvimdə görünən bütün tarix mətnləri bu cədvəllərdən formatlanır.
const AZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];
/** İndeks = getUTCDay(): 0 = Bazar. */
const AZ_WEEKDAYS_SHORT = ['B.', 'B.E.', 'Ç.A.', 'Ç.', 'C.A.', 'C.', 'Ş.'];
const AZ_WEEKDAYS_LONG = [
  'Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə',
  'Cümə axşamı', 'Cümə', 'Şənbə',
];

type AzMarker = { year: number; month: number; day: number };

/** FullCalendar-ın `{ year, month, day }` markerindən UTC Date qurur (month 0-dan başlayır). */
function markerToUtc(marker: AzMarker): Date {
  return new Date(Date.UTC(marker.year, marker.month, marker.day));
}

function monthTitle(marker: AzMarker): string {
  return `${AZ_MONTHS[marker.month]} ${marker.year}`;
}

/**
 * `titleFormat` çağırılanda FullCalendar aralığın sonundan 1 ms çıxarır, yəni
 * `end` artıq son gündür (eksklyuziv deyil) — əlavə düzəliş etmək lazım deyil.
 */
function rangeTitle(start: AzMarker, end?: AzMarker): string {
  const last = end ?? start;
  const sameMonth = start.month === last.month && start.year === last.year;
  if (sameMonth && start.day === last.day) {
    return `${start.day} ${AZ_MONTHS[start.month]} ${start.year}`;
  }
  const from = sameMonth ? `${start.day}` : `${start.day} ${AZ_MONTHS[start.month]}`;
  return `${from} – ${last.day} ${AZ_MONTHS[last.month]} ${last.year}`;
}

/** Date obyektinin *lokal* sahələrindən `yyyy-MM-dd` qurur (FullCalendar hücrə tarixləri lokaldır). */
function localDateIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `yyyy-MM-dd` → "7 Sentyabr 2026, Bazar ertəsi" */
function azDayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return `${day} ${AZ_MONTHS[month - 1]} ${year}, ${AZ_WEEKDAYS_LONG[utc.getUTCDay()]}`;
}

@Component({
  selector: 'app-plan-calendar',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSelectModule,
    FullCalendarModule,
    AuditLoadingOverlayComponent,
  ],
  providers: [TableService],
  templateUrl: './plan-calendar.component.html',
  styleUrl: './plan-calendar.component.scss',
})
export class PlanCalendarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('calendar') calendarComponent?: FullCalendarComponent;

  /** Həm status filtrini, həm legend-i idarə edir. Kodlar DB-də real olan dəyərlərdir. */
  readonly planStatuses: PlanStatusOption[] = [
    { value: 1, label: 'Təsdiq gözləyənlər', color: '#F59E0B' },
    { value: 2, label: 'Təsdiq olunmuşlar', color: '#10B981' },
    { value: -1, label: 'Rədd olunmuşlar', color: '#EF4444' },
  ];

  calendarForm!: FormGroup;

  currentView = 'dayGridMonth';
  currentTitle = '';
  isLoading = true;
  /** Yüklənmiş plan sayı (mağaza filtri tətbiq olunduqdan sonra). */
  totalEvents = 0;
  /** Backend-in bildirdiyi ümumi uyğun plan sayı. */
  totalMatching = 0;
  /** `true` olduqda nəticə `MAX_ROWS`-a görə kəsilib. */
  truncated = false;

  /** Seçilmiş günün ISO tarixi — yan panel bununla idarə olunur. */
  selectedDay: string | null = null;
  selectedDayLabel = '';
  selectedDayPlans: DayPlanRow[] = [];

  private canvasObserver?: ResizeObserver;
  private lastCanvasWidth = 0;

  /** Bakı divar saatı ilə gün → o günün planları. */
  private plansByDay = new Map<string, PlanDetails[]>();

  /**
   * FullCalendar funksiya event source-u: görünən aralıq dəyişəndə FullCalendar
   * özü çağırır, filtr dəyişəndə isə `refetchEvents()` təkrar işə salır.
   */
  private readonly fetchEvents: EventSourceFunc = (info, success, failure) => {
    // `startStr`/`endStr` təqvimin öz offseti ilə qurulur — yenidən formatlamaq
    // aralığı sürüşdürər. `endStr` onsuz da eksklyuzivdir.
    const endIso = info.endStr.slice(0, 10);
    // StartDate DB-də UTC saxlanılır, grid isə +04-də çəkilir: aşağı sərhədə bir gün pad.
    const startIso = isoDateAddDays(info.startStr.slice(0, 10), -1);

    const tableState = new TableState();
    tableState.paginator.page = 0;
    tableState.paginator.size = MAX_ROWS;
    tableState.sorting.column = 'startDate';
    tableState.sorting.direction = 'asc';
    tableState.filter = { startDate: startIso, endDate: endIso };

    const status = this.calendarForm.value.status;
    if (status != null) {
      tableState.filter['status'] = String(status);
    }

    this.tableService.api_url = 'inspectionPlans/getDetails';
    this.tableService.fill(tableState).subscribe({
      next: (response) => {
        const rows: PlanDetails[] = response?.data?.items ?? [];
        const total = response?.data?.total ?? rows.length;
        const visible = this.applyStoreFilter(rows);

        this.plansByDay = this.groupByDay(visible);
        // Ay görünüşündə hər gün üçün bir xülasə, digərlərində hər plan üçün bir event.
        const monthly = (this.api?.view.type ?? this.currentView) === 'dayGridMonth';
        success(monthly ? this.buildDaySummaryEvents() : visible.map((plan) => this.toPlanEvent(plan)));

        this.fromCalendar(() => {
          this.totalEvents = visible.length;
          this.totalMatching = total;
          this.truncated = total > rows.length;
          this.refreshSelectedDay();
        });
      },
      error: (err: unknown) => {
        failure(err instanceof Error ? err : new Error('Plan sorğusu alınmadı'));
        this.plansByDay = new Map();
        this.fromCalendar(() => {
          this.totalEvents = 0;
          this.totalMatching = 0;
          this.truncated = false;
          this.refreshSelectedDay();
          this.notify.error('Təqvim yüklənmədi', {
            message: 'Planları gətirmək mümkün olmadı. Bir az sonra yenidən cəhd edin.',
          });
        });
      },
    });
  };

  private readonly handleLoading = (loading: boolean): void => {
    this.fromCalendar(() => {
      this.isLoading = loading;
    });
  };

  private readonly handleDatesSet = (arg: DatesSetArg): void => {
    this.fromCalendar(() => {
      this.currentTitle = arg.view.title;
      this.currentView = arg.view.type;
      this.markSelectedCell();
    });
  };

  /** Ay görünüşündə bütün hücrə klikləmə sahəsidir — boş günlər də panel açır. */
  private readonly handleDayCellMount = (arg: { date: Date; el: HTMLElement }): void => {
    const iso = localDateIso(arg.date);
    arg.el.classList.add('cal-day-cell');
    arg.el.addEventListener('click', () => this.zone.run(() => this.openDay(iso)));
    if (iso === this.selectedDay) {
      arg.el.classList.add('cal-day-selected');
    }
  };

  private readonly renderEventContent = (arg: EventContentArg) => {
    const dayIso = arg.event.extendedProps['dayIso'];
    return {
      domNodes: [
        typeof dayIso === 'string' ? this.buildDaySummaryNode(arg) : this.buildPlanNode(arg),
      ],
    };
  };

  private readonly styleEvent = (info: EventMountArg): void => {
    if (typeof info.event.extendedProps['dayIso'] === 'string') {
      // Xülasə çipinin rəngi seqmentlərdən gəlir — konteyner şəffaf qalır.
      info.el.style.background = 'transparent';
      info.el.style.border = 'none';
      info.el.style.padding = '0';
      info.el.style.margin = '0';
      return;
    }
    const color = info.event.backgroundColor || FALLBACK_COLOR;
    info.el.style.backgroundColor = color;
    info.el.style.borderColor = color;
    info.el.style.color = 'white';
    info.el.style.fontSize = '12px';
    info.el.style.padding = '2px 7px';
    info.el.style.borderRadius = '5px';
    info.el.style.border = 'none';
  };

  // Stabil obyekt: `ngDoCheck` hər dəyişiklik dövründə açarları referansla müqayisə
  // etdiyi üçün bu field heç vaxt yenidən yaradılmır.
  readonly calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, listPlugin],
    locale: azLocale,
    dayHeaderContent: (arg) =>
      arg.view.type === 'dayGridMonth'
        ? AZ_WEEKDAYS_SHORT[arg.dow]
        : `${AZ_WEEKDAYS_SHORT[arg.dow]} ${arg.date.getDate()}`,
    listDayFormat: (arg) => `${arg.date.day} ${AZ_MONTHS[arg.date.month]} ${arg.date.year}`,
    listDaySideFormat: (arg) => AZ_WEEKDAYS_LONG[markerToUtc(arg.date).getUTCDay()],
    initialView: 'dayGridMonth',
    initialDate: new Date(),
    headerToolbar: false,
    height: 'auto',
    dayMaxEvents: 4,
    lazyFetching: false,
    views: {
      dayGridMonth: { titleFormat: (arg) => monthTitle(arg.start) },
      listMonth: { titleFormat: (arg) => monthTitle(arg.start) },
      dayGridWeek: { titleFormat: (arg) => rangeTitle(arg.start, arg.end) },
    },
    events: this.fetchEvents,
    loading: this.handleLoading,
    datesSet: this.handleDatesSet,
    dayCellDidMount: this.handleDayCellMount,
    eventClick: (arg: EventClickArg) => this.handleEventClick(arg),
    eventContent: this.renderEventContent,
    eventDidMount: this.styleEvent,
  };

  constructor(
    private tableService: TableService,
    private fb: FormBuilder,
    private notify: NotificationService,
    private host: ElementRef<HTMLElement>,
    private zone: NgZone
  ) {
    this.calendarForm = this.fb.group({
      status: [null],
      locationName: [''],
    });
  }

  /**
   * Təqvimin sütunu yan panel açılanda/bağlananda və breakpoint dəyişəndə daralır,
   * FullCalendar isə yalnız pəncərə ölçüsünə baxır. `updateSize()`-i vaxta görə
   * təxmin etmək işləmir (layout hələ tətbiq olunmamış olur), ona görə faktiki
   * genişlik dəyişikliyini `ResizeObserver` izləyir.
   */
  ngAfterViewInit(): void {
    const canvas = this.host.nativeElement.querySelector('.cal-canvas');
    if (!canvas || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.canvasObserver = new ResizeObserver((entries) => {
        const width = Math.round(entries[0]?.contentRect.width ?? 0);
        if (width === 0 || width === this.lastCanvasWidth) {
          return;
        }
        this.lastCanvasWidth = width;
        this.api?.updateSize();
      });
      this.canvasObserver.observe(canvas);
    });
  }

  ngOnDestroy(): void {
    this.canvasObserver?.disconnect();
    this.plansByDay.clear();
  }

  statusLabel(status: number): string {
    return this.planStatuses.find((option) => option.value === status)?.label ?? 'Bilinmir';
  }

  statusColor(status: number): string {
    return this.planStatuses.find((option) => option.value === status)?.color ?? FALLBACK_COLOR;
  }

  changeCalView(view: string): void {
    this.api?.changeView(view);
  }

  goPrev(): void {
    this.api?.prev();
  }

  goNext(): void {
    this.api?.next();
  }

  goToday(): void {
    this.api?.today();
  }

  onSearch(): void {
    this.api?.refetchEvents();
  }

  /** Legend-dən statusa görə filtr — təkrar klik filtri götürür. */
  filterByStatus(status: number): void {
    const next = this.calendarForm.value.status === status ? null : status;
    this.calendarForm.patchValue({ status: next });
    this.api?.refetchEvents();
  }

  clearFilters(): void {
    this.calendarForm.reset({ status: null, locationName: '' });
    this.api?.refetchEvents();
  }

  isStatusActive(status: number): boolean {
    return this.calendarForm.value.status === status;
  }

  openDay(iso: string): void {
    this.selectedDay = iso;
    this.selectedDayLabel = azDayLabel(iso);
    this.selectedDayPlans = this.buildDayRows(iso);
    this.markSelectedCell();
  }

  closeDayPanel(): void {
    if (this.selectedDay == null) {
      return;
    }
    this.selectedDay = null;
    this.selectedDayLabel = '';
    this.selectedDayPlans = [];
    this.markSelectedCell();
  }

  private get api(): CalendarApi | null {
    return this.calendarComponent?.getApi() ?? null;
  }

  /**
   * FullCalendar callback-ləri uşaq komponentin `ngAfterViewInit`-i içində, cari
   * dəyişiklik dövrü artıq yoxlanıldıqdan sonra işə düşür. Yazıları mikrotaska
   * köçürmək NG0100 xətasının qarşısını alır.
   */
  private fromCalendar(fn: () => void): void {
    queueMicrotask(fn);
  }

  /** Yeni məlumat gəldikdən sonra açıq panelin məzmununu yeniləyir. */
  private refreshSelectedDay(): void {
    if (this.selectedDay) {
      this.selectedDayPlans = this.buildDayRows(this.selectedDay);
    }
    this.markSelectedCell();
  }

  /**
   * Seçilmiş günü grid-də işarələyir. FullCalendar `dayCellClassNames`-i seçim
   * dəyişəndə yenidən hesablamadığı üçün sinif birbaşa DOM-da dəyişilir.
   */
  private markSelectedCell(): void {
    const root = this.host.nativeElement;
    root.querySelectorAll('.cal-day-selected').forEach((el) => el.classList.remove('cal-day-selected'));
    if (this.selectedDay) {
      root
        .querySelector(`.fc-daygrid-day[data-date="${this.selectedDay}"]`)
        ?.classList.add('cal-day-selected');
    }
  }

  /**
   * Mağaza filtri client-side tətbiq olunur: backend-in `locationName` filtri
   * INNER JOIN qurur və başqa firmaya bağlı location sətri olan planları itirir,
   * halbuki aralıq onsuz da tam yüklənib. Həm ada, həm koda görə axtarır.
   */
  private applyStoreFilter(rows: PlanDetails[]): PlanDetails[] {
    const term = String(this.calendarForm.value.locationName ?? '').trim().toLocaleLowerCase('az');
    if (!term) {
      return rows;
    }

    return rows.filter(
      (plan) =>
        (plan.locationName ?? '').toLocaleLowerCase('az').includes(term) ||
        String(plan.locationCode ?? '').includes(term)
    );
  }

  /** Planları Bakı divar saatındaki günə görə qruplayır. */
  private groupByDay(rows: PlanDetails[]): Map<string, PlanDetails[]> {
    const map = new Map<string, PlanDetails[]>();
    for (const plan of rows) {
      const wall = toBakuWallClock(plan.startDate);
      if (!wall) {
        continue;
      }
      const iso = wall.slice(0, 10);
      const bucket = map.get(iso);
      if (bucket) {
        bucket.push(plan);
      } else {
        map.set(iso, [plan]);
      }
    }
    return map;
  }

  /** Ay görünüşü: hər gün üçün bir xülasə event-i — hücrə heç vaxt daşmır. */
  private buildDaySummaryEvents(): EventInput[] {
    const events: EventInput[] = [];
    for (const [iso, plans] of this.plansByDay) {
      events.push({
        id: `day-${iso}`,
        start: iso,
        allDay: true,
        display: 'block',
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        extendedProps: {
          dayIso: iso,
          total: plans.length,
          counts: this.countByStatus(plans),
        },
      });
    }
    return events;
  }

  private countByStatus(plans: PlanDetails[]): DayStatusCount[] {
    const counts: DayStatusCount[] = [];
    for (const option of this.planStatuses) {
      const count = plans.filter((plan) => plan.status === option.value).length;
      if (count > 0) {
        counts.push({ label: option.label, color: option.color, count });
      }
    }
    const known = counts.reduce((sum, item) => sum + item.count, 0);
    if (known < plans.length) {
      counts.push({ label: 'Bilinmir', color: FALLBACK_COLOR, count: plans.length - known });
    }
    return counts;
  }

  private toPlanEvent(plan: PlanDetails): EventInput {
    const color = this.statusColor(plan.status);

    return {
      id: String(plan.id),
      title: plan.locationName || `Kod ${plan.locationCode}`,
      start: toBakuWallClock(plan.startDate) ?? undefined,
      end: toBakuWallClock(plan.endDate) ?? undefined,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        locationCode: plan.locationCode,
        statusLabel: this.statusLabel(plan.status),
      },
    };
  }

  /** Yan panel sətirləri — vaxtlar Bakı saatı ilə formatlanır. */
  private buildDayRows(iso: string): DayPlanRow[] {
    const plans = this.plansByDay.get(iso) ?? [];
    return [...plans]
      .sort(
        (a, b) =>
          (a.startDate ?? '').localeCompare(b.startDate ?? '') ||
          (a.locationName ?? '').localeCompare(b.locationName ?? '', 'az')
      )
      .map((plan) => {
        const from = toBakuDisplay(plan.startDate)?.slice(-5) ?? '—';
        const to = toBakuDisplay(plan.endDate)?.slice(-5) ?? '—';

        return {
          id: plan.id,
          locationName: plan.locationName || `Kod ${plan.locationCode}`,
          locationCode: plan.locationCode,
          inspectorsName: plan.inspectorsName || 'Müfəttiş təyin edilməyib',
          statusLabel: this.statusLabel(plan.status),
          statusColor: this.statusColor(plan.status),
          timeRange: `${from} – ${to}`,
        };
      });
  }

  /** Ay görünüşündəki xülasə çipi: ümumi say + statuslara görə seqmentli zolaq. */
  private buildDaySummaryNode(arg: EventContentArg): HTMLElement {
    const total = Number(arg.event.extendedProps['total'] ?? 0);
    const counts = (arg.event.extendedProps['counts'] ?? []) as DayStatusCount[];

    const wrap = document.createElement('div');
    wrap.className = 'cal-daysum';
    wrap.title = counts.map((item) => `${item.count} ${item.label}`).join(' · ');

    const top = document.createElement('div');
    top.className = 'cal-daysum-top';
    const num = document.createElement('span');
    num.className = 'cal-daysum-count';
    num.textContent = String(total);
    const unit = document.createElement('span');
    unit.className = 'cal-daysum-unit';
    unit.textContent = 'plan';
    top.append(num, unit);
    wrap.appendChild(top);

    const bar = document.createElement('div');
    bar.className = 'cal-daysum-bar';
    for (const item of counts) {
      const segment = document.createElement('i');
      segment.style.flexGrow = String(item.count);
      segment.style.background = item.color;
      bar.appendChild(segment);
    }
    wrap.appendChild(bar);

    const legend = document.createElement('div');
    legend.className = 'cal-daysum-legend';
    for (const item of counts) {
      const chip = document.createElement('span');
      const dot = document.createElement('i');
      dot.style.background = item.color;
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(String(item.count)));
      legend.appendChild(chip);
    }
    wrap.appendChild(legend);

    return wrap;
  }

  /** Həftə/siyahı görünüşündə bir sətirlik kompakt plan çipi. */
  private buildPlanNode(arg: EventContentArg): HTMLElement {
    const row = document.createElement('div');
    row.className = 'cal-ev-row';

    const title = document.createElement('span');
    title.className = 'cal-ev-name';
    title.textContent = arg.event.title;
    row.appendChild(title);

    const code = arg.event.extendedProps['locationCode'];
    if (code != null) {
      const codeEl = document.createElement('span');
      codeEl.className = 'cal-ev-code';
      codeEl.textContent = String(code);
      row.appendChild(codeEl);
    }

    row.title = [arg.event.title, code, arg.event.extendedProps['statusLabel']]
      .filter((part) => part != null && part !== '')
      .join(' · ');

    return row;
  }

  /** Hər klik günü açır: ay görünüşündə xülasə çipi, həftə/siyahıda planın günü. */
  private handleEventClick(arg: EventClickArg): void {
    arg.jsEvent.stopPropagation();
    const dayIso = arg.event.extendedProps['dayIso'];
    if (typeof dayIso === 'string') {
      this.openDay(dayIso);
      return;
    }
    if (arg.event.start) {
      this.openDay(localDateIso(arg.event.start));
    }
  }
}
