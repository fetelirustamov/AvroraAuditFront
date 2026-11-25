import { ComponentFixture, TestBed } from '@angular/core/testing';
import { STATUS_ACTIONS, STATUS_REASON_MAX_LENGTH, statusActionConfirm } from './status-actions';
import { StatusChange, StatusReasonComponent, StatusReasonSubject } from './status-reason.component';

function change(overrides: Partial<StatusChange> = {}): StatusChange {
    return {
        refId: 7,
        fromStatus: 3,
        toStatus: 2,
        reason: 'Şəkillər bulanıqdır',
        changedBy: 1,
        changedByName: 'Aysel Məmmədova',
        changedDate: '2026-11-25T10:30:00+04:00',
        ...overrides,
    };
}

describe('StatusReasonComponent', () => {
    let fixture: ComponentFixture<StatusReasonComponent>;

    function render(subject: StatusReasonSubject, value: StatusChange): HTMLElement {
        fixture.componentRef.setInput('subject', subject);
        fixture.componentRef.setInput('change', value);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    beforeEach(() => {
        fixture = TestBed.createComponent(StatusReasonComponent);
    });

    it('names the action that sent the record back', () => {
        const title = (subject: StatusReasonSubject, value: StatusChange) =>
            render(subject, value).querySelector('.status-reason-title')?.textContent?.trim();

        expect(title('plan', change({ fromStatus: 3, toStatus: 2 }))).toBe('Mobilə qaytarılma səbəbi');
        expect(title('plan', change({ fromStatus: 4, toStatus: 2 }))).toBe('Yenidən açılma səbəbi');
        expect(title('plan', change({ fromStatus: 1, toStatus: -1 }))).toBe('Rədd səbəbi');
        expect(title('disruption', change({ fromStatus: 1, toStatus: 0 }))).toBe('Müfəttişə qaytarılma səbəbi');
    });

    it('shows the reason, author and a danger tone for rejection', () => {
        const el = render('disruption', change({ toStatus: -1 }));
        expect(el.querySelector('.status-reason-text')?.textContent).toContain('Şəkillər bulanıqdır');
        expect(el.querySelector('.status-reason-meta')?.textContent).toContain('Aysel Məmmədova');
        expect(el.querySelector('.status-reason')?.classList).toContain('is-danger');
    });
});

describe('statusActionConfirm', () => {
    it('requires a bounded reason for every send-back action, not for approve', () => {
        for (const key of ['reject', 'returnToMobile', 'reopen', 'returnToInspector'] as const) {
            expect(statusActionConfirm(STATUS_ACTIONS[key], 1).reason)
                .toEqual({ required: true, maxLength: STATUS_REASON_MAX_LENGTH });
        }
        expect(statusActionConfirm(STATUS_ACTIONS.approve, 1).reason).toBeUndefined();
    });
});
