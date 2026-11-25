import { DISRUPTION_STATUS, DisruptionApprover, disruptionActionStatus, disruptionActions, nextApproveStatus } from './disruption-approval';

const inspector: DisruptionApprover = { isHeadInspector: false, isAdmin: false, userId: 7 };
const head: DisruptionApprover = { isHeadInspector: true, isAdmin: false, userId: 9 };
const admin: DisruptionApprover = { isHeadInspector: true, isAdmin: true, userId: 1 };
const { INSPECTOR, HEAD_INSPECTOR, APPROVED, REJECTED } = DISRUPTION_STATUS;

describe('disruption-approval', () => {
  it('müfəttiş yalnız öz qeydini müfəttiş mərhələsində təsdiqləyir və ya rədd edir', () => {
    expect(disruptionActions({ status: INSPECTOR, inspectorId: 7 }, inspector)).toEqual(['approve', 'reject']);
    expect(disruptionActions({ status: INSPECTOR, inspectorId: 8 }, inspector)).toEqual([]);
    expect(disruptionActions({ status: HEAD_INSPECTOR, inspectorId: 7 }, inspector)).toEqual([]);
  });

  it('baş müfəttiş 1-də müfəttişə də qaytarır, zəncir mərhələsində əməliyyat yoxdur', () => {
    expect(disruptionActions({ status: INSPECTOR, inspectorId: 7 }, head)).toEqual(['approve', 'reject']);
    expect(disruptionActions({ status: HEAD_INSPECTOR, inspectorId: 7 }, head)).toEqual(['approve', 'reject', 'returnToInspector']);
    expect(disruptionActions({ status: APPROVED, inspectorId: 7 }, head)).toEqual([]);
    expect(disruptionActions({ status: REJECTED, inspectorId: 7 }, admin)).toEqual([]);
  });

  it('təsdiqin nəticəsi rola görədir: müfəttiş 1, baş müfəttiş 2, Admin addım-addım', () => {
    expect(nextApproveStatus(INSPECTOR, inspector)).toBe(HEAD_INSPECTOR);
    expect(nextApproveStatus(INSPECTOR, head)).toBe(APPROVED);
    expect(nextApproveStatus(INSPECTOR, admin)).toBe(HEAD_INSPECTOR);
    expect(nextApproveStatus(HEAD_INSPECTOR, admin)).toBe(APPROVED);
  });

  it('rədd və müfəttişə qaytarma statusları', () => {
    expect(disruptionActionStatus('reject', HEAD_INSPECTOR, head)).toBe(REJECTED);
    expect(disruptionActionStatus('returnToInspector', HEAD_INSPECTOR, head)).toBe(INSPECTOR);
  });
});
