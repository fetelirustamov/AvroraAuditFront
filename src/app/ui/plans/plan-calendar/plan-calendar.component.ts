import { Component, HostListener, Renderer2, ViewChild } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core/index.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import { CustomizerSettingsService } from '../../../customizer-settings/customizer-settings.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlanService } from '../plan.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { InspectionsService } from '../../inspections/inspections.service';
import { TableState } from '../../../models/table-state.model';
import { Firm } from '../../inspections/firm.model';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule, NgFor } from '@angular/common';
import { finalize } from 'rxjs';
import { PlanDetails } from '../plan.model';
import { MatButtonModule } from '@angular/material/button';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { TableService } from '../../services/table.service';

@Component({
  selector: 'app-plan-calendar',
  imports: [MatCardModule, FullCalendarModule, MatSelectModule, FormsModule, ReactiveFormsModule, MatButtonModule, NgFor, CommonModule, AuditLoadingOverlayComponent],
  templateUrl: './plan-calendar.component.html',
  styleUrl: './plan-calendar.component.scss'
})
export class PlanCalendarComponent {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  statusOptions = [
    { label: 'Təsdiq gözləyənlər', value: 1 },
    { label: 'Təsdiq olunmuşlar', value: 2 },
    { label: 'Rədd olunmuşlar', value: -1 }
  ];

  private statusColors: Record<number, string> = {
    1: '#F59E0B',
    2: '#10B981',
    [-1]: '#EF4444',
  };

  currentView = 'dayGridMonth';
  currentTitle = '';
  totalEvents = 0;

  calendarOptions: CalendarOptions;
  public firms: Firm[] = [];
  calendarForm!: FormGroup;
  public isLoading = false;
  public searchTerm: string = '';
  public pageSize: number = 10;
  public status: number = 1;
  private _tableState: TableState = new TableState();
  public planDetails: PlanDetails[] = [];
  private events: EventInput[] = [];
  private tooltip: HTMLElement | null = null;

  constructor(
    private inspectionService: InspectionsService,
    private _tableService: TableService,
    private fb: FormBuilder,
    private planService: PlanService,
    private notify: NotificationService,
    public themeService: CustomizerSettingsService,
    private renderer: Renderer2
  ) {
    this.getFirms();

    this._tableState = new TableState();
    this._tableService.api_url = 'inspectionPlans/getDetails';
    this._tableState.filter['status'] = '1';
    this._tableState.paginator.page = 0;
    this._tableState.sorting.direction = 'desc';
    this._tableState.paginator.size = Number(this.pageSize);
    this.createForm();

    this.calendarOptions = {
      plugins: [dayGridPlugin, listPlugin],
      initialView: 'dayGridMonth',
      initialDate: new Date(),
      dayMaxEvents: true,
      headerToolbar: false,
      events: this.events,
      height: 'auto',
      datesSet: (arg) => {
        this.currentTitle = arg.view.title;
        this.currentView = arg.view.type;
      },
      eventClick: this.handleEventClick.bind(this),
      eventContent: (arg) => {
        const container = document.createElement('div');

        const titleEl = document.createElement('div');
        titleEl.className = 'fc-event-title';
        titleEl.innerHTML = arg.event.title;
        container.appendChild(titleEl);

        const codeEl = document.createElement('div');
        codeEl.className = 'fc-event-code';
        codeEl.innerHTML = arg.event.extendedProps['locationCode'] || '';
        container.appendChild(codeEl);

        return { domNodes: [container] };
      },
      eventDidMount: (info) => {
        info.el.style.backgroundColor = info.event.backgroundColor || this.statusColors[1];
        info.el.style.borderColor = info.event.backgroundColor || this.statusColors[1];
        info.el.style.color = 'white';
        info.el.style.fontSize = '12px';
        info.el.style.padding = '3px 8px';
        info.el.style.borderRadius = '5px';
        info.el.style.border = 'none';
      },
    };

    this.fill();
  }

  changeCalView(view: string): void {
    this.currentView = view;
    this.calendarComponent.getApi().changeView(view);
  }

  goPrev(): void {
    this.calendarComponent.getApi().prev();
  }

  goNext(): void {
    this.calendarComponent.getApi().next();
  }

  goToday(): void {
    this.calendarComponent.getApi().today();
  }

  filterByStatus(status: number): void {
    this.calendarForm.patchValue({ status });
    this._tableState.filter['status'] = status.toString();
    this.fill();
  }

  handleEventClick(arg: any): void {
    arg.jsEvent.stopPropagation();
    this.removeTooltip();

    this.tooltip = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltip, 'custom-tooltip');
    this.renderer.setAttribute(this.tooltip!, 'data-event-id', arg.event.id);

    const content = `
      <div class="arrow-up"></div>
      <h5>${arg.event.title}</h5>
      <p><strong>Müfəttiş:</strong> ${arg.event.extendedProps['auditor'] || 'Məlumat yoxdur'}</p>
      <p><strong>Başlama tarixi:</strong> ${arg.event.extendedProps['startDate']}</p>
      <p><strong>Bitmə tarixi:</strong> ${arg.event.extendedProps['endDate']}</p>
    `;
    this.renderer.setProperty(this.tooltip, 'innerHTML', content);

    const rect = arg.el.getBoundingClientRect();
    let x = rect.right + 10;
    let y = rect.top;

    const tooltipWidth = 260;
    const tooltipHeight = 160;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (x + tooltipWidth > windowWidth) {
      x = rect.left - tooltipWidth - 10;
    }
    if (y + tooltipHeight > windowHeight) {
      y = rect.top - tooltipHeight - 10;
    }

    this.renderer.setStyle(this.tooltip, 'top', `${y + window.scrollY}px`);
    this.renderer.setStyle(this.tooltip, 'left', `${x}px`);
    this.renderer.appendChild(document.body, this.tooltip);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.tooltip && !this.tooltip.contains(event.target as Node)) {
      this.removeTooltip();
    }
  }

  private removeTooltip(): void {
    if (this.tooltip) {
      this.renderer.removeChild(document.body, this.tooltip);
      this.tooltip = null;
    }
  }

  createForm() {
    this.calendarForm = this.fb.group({
      firmId: [null, Validators.required],
      status: [null, Validators.required],
    });
  }

  getFirms() {
    this.inspectionService.getFirms().subscribe((response) => {
      this.firms = response.data;
    });
  }

  onSearch() {
    if (this.calendarForm.valid) {
      const formData = this.calendarForm.value;
      this.status = formData.status;

      if (this.status != null) {
        this._tableState.filter['status'] = this.status.toString();
      }
      if (formData.firmId != null) {
        this._tableState.filter['firmId'] = formData.firmId.toString();
      }

      this.fill();
    }
  }

  private fill() {
    this.isLoading = true;
    this._tableState.paginator.size = Number(this.pageSize);
    if (!this._tableState.filter) {
      this._tableState.filter = {};
    }
    this._tableState.searchTerm = this.searchTerm;

    this._tableService.fill(this._tableState).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe((response) => {
      this._tableState.paginator.total = response.data != null ? response.data.total : 0;
      this.planDetails = response.data.items;

      this.events = this.planDetails.map((item, index) => ({
        id: item.id.toString() || `event-${index}`,
        title: item.locationName,
        start: item.startDate,
        end: item.endDate,
        extendedProps: {
          locationCode: item.locationCode,
          auditor: item.inspectorsName,
          startDate: this.convertUtcToBakuFormat(item.startDate),
          endDate: this.convertUtcToBakuFormat(item.endDate),
        },
        backgroundColor: this.statusColors[item.status] ?? '#6366F1',
        borderColor: this.statusColors[item.status] ?? '#6366F1',
      }));

      this.totalEvents = this.events.length;
      this.calendarOptions = { ...this.calendarOptions, events: this.events };
    });
  }

  convertUtcToBakuFormat(dateStr: string): string {
    const utcDate = new Date(dateStr);
    const bakuDate = new Date(utcDate.getTime() + 4 * 60 * 60 * 1000);
    const year = bakuDate.getFullYear();
    const month = String(bakuDate.getMonth() + 1).padStart(2, '0');
    const day = String(bakuDate.getDate()).padStart(2, '0');
    const hours = String(bakuDate.getHours()).padStart(2, '0');
    const minutes = String(bakuDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}
