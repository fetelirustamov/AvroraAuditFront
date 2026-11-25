import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { PlanStatusTableComponent } from './plan-status-table.component';
import { INSPECTION_APPROVE_PAGE, PLAN_ACTIONS_PAGE, PLAN_STATUS, PlanStatusPage } from './plan-status-page';
import { appTestProviders } from '../../../../testing/test-providers';
import { InspectionPlan } from '../../inspections/InpectionPlan.model';

const plan = (id: number, status: number): InspectionPlan =>
  ({ id, status, locationCode: String(4300 + id), locationName: `Mağaza ${id}` }) as InspectionPlan;

describe('PlanStatusTableComponent', () => {
  let fixture: ComponentFixture<PlanStatusTableComponent>;
  let component: PlanStatusTableComponent;
  let http: HttpTestingController;

  function create(page: PlanStatusPage, query: Record<string, string> = {}): void {
    TestBed.configureTestingModule({
      imports: [PlanStatusTableComponent],
      providers: [
        appTestProviders,
        { provide: ActivatedRoute, useValue: { snapshot: { data: { statusPage: page }, queryParamMap: convertToParamMap(query) } } },
      ],
    });
    fixture = TestBed.createComponent(PlanStatusTableComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  function respondList(items: InspectionPlan[]): any {
    const req = http.expectOne(r => r.url.endsWith('/inspectionPlans/getDetails'));
    req.flush({ success: true, message: '', data: { items, total: items.length } });
    fixture.detectChanges();
    return req.request.body;
  }

  afterEach(() => http.match(() => true).forEach(r => r.flush({ success: true, data: [] })));

  it('firma seçmədən açılışda ilk statusun növbəsini yükləyir', () => {
    create(PLAN_ACTIONS_PAGE);
    const body = respondList([plan(1, PLAN_STATUS.PENDING)]);
    expect(body.filter.status).toBe(String(PLAN_STATUS.PENDING));
    expect(body.filter.firmId).toBeUndefined();
    expect(component.rows.length).toBe(1);
  });

  it('URL-dəki status səhifənin statuslarından deyilsə nəzərə alınmır', () => {
    create(INSPECTION_APPROVE_PAGE, { status: '1' });
    const body = respondList([]);
    expect(body.filter.status).toBe(String(PLAN_STATUS.AWAITING_APPROVAL));
  });

  it('sətirdə yalnız statusuna uyğun keçidlər göstərilir', () => {
    create(PLAN_ACTIONS_PAGE);
    respondList([plan(1, PLAN_STATUS.PENDING), plan(2, PLAN_STATUS.REJECTED)]);
    const keys = (row: InspectionPlan) => component.rowTransitions(row).map(t => t.action.key);
    expect(keys(component.rows[0])).toEqual(['approve', 'reject']);
    expect(keys(component.rows[1])).toEqual(['approve']);
  });

  it('toplu keçid seçilmiş sətirlərin hamısına uyğun olanda aktivdir', () => {
    create(PLAN_ACTIONS_PAGE, { status: '-1' });
    respondList([plan(1, PLAN_STATUS.PENDING), plan(2, PLAN_STATUS.REJECTED)]);
    const reject = PLAN_ACTIONS_PAGE.transitions.find(t => t.action.key === 'reject')!;
    component.selection.select(component.rows[0]);
    expect(component.canApplyToSelection(reject)).toBeTrue();
    component.selection.select(component.rows[1]);
    expect(component.canApplyToSelection(reject)).toBeFalse();
  });

  it('yoxlanmış planlarda nəticə və uyğunsuzluq sayı ayrıca sorğu ilə gəlir', () => {
    create(INSPECTION_APPROVE_PAGE);
    respondList([plan(7, PLAN_STATUS.AWAITING_APPROVAL), plan(9, PLAN_STATUS.AWAITING_APPROVAL)]);
    const req = http.expectOne(r => r.url.endsWith('/inspectionPlans/checklist/summaries'));
    expect(req.request.params.getAll('ids')).toEqual(['7', '9']);
    req.flush({ success: true, data: [{ planId: 7, result: 82.5, disruptionCount: 3 }] });
    expect(component.summaryOf(component.rows[0])?.disruptionCount).toBe(3);
    expect(component.summaryOf(component.rows[1])).toBeUndefined();
    expect(component.displayedColumns).toContain('result');
  });

  it('plan əməliyyatlarında nəticə sorğusu getmir', () => {
    create(PLAN_ACTIONS_PAGE);
    respondList([plan(1, PLAN_STATUS.PENDING)]);
    http.expectNone(r => r.url.endsWith('/inspectionPlans/checklist/summaries'));
    expect(component.displayedColumns).not.toContain('result');
  });

  it('firma seçilməyəndə firma sütunu görünür', () => {
    create(INSPECTION_APPROVE_PAGE);
    respondList([plan(1, PLAN_STATUS.AWAITING_APPROVAL)]);
    expect(component.displayedColumns).toContain('firmName');
  });
});
