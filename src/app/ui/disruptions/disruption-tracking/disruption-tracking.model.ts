import { levelRoleLabel } from '../../../shared/utils/approval-level';

/**
 * Backend-in hesabladığı mərhələ (DisruptionRepository.TrackingCte):
 * faza A — Disruptions.Status (0 müfəttiş, 1 baş müfəttiş), faza B — cari DisruptionAnswers addımı.
 */
export type StageCode =
    | 'INSPECTOR' | 'HEAD_INSPECTOR'
    | 'STORE_ANSWER' | 'CHAIN_APPROVAL' | 'RETURNED'
    | 'CLOSED' | 'NO_CHAIN' | 'REJECTED' | 'UNKNOWN';

export type ChipTone = 'is-warning' | 'is-info' | 'is-danger' | 'is-success' | 'is-neutral';

export interface StageMeta {
    label: string;
    icon: string;
    tone: ChipTone;
}

export const STAGE_META: Record<StageCode, StageMeta> = {
    INSPECTOR: { label: 'Müfəttişin təsdiqində', icon: 'person_search', tone: 'is-warning' },
    HEAD_INSPECTOR: { label: 'Baş müfəttişin təsdiqində', icon: 'supervisor_account', tone: 'is-warning' },
    STORE_ANSWER: { label: 'Mağazanın cavabında', icon: 'storefront', tone: 'is-info' },
    CHAIN_APPROVAL: { label: 'Zəncirin təsdiqində', icon: 'account_tree', tone: 'is-info' },
    RETURNED: { label: 'Qaytarılıb, yenidən cavab gözləyir', icon: 'undo', tone: 'is-danger' },
    CLOSED: { label: 'Bağlanıb', icon: 'task_alt', tone: 'is-success' },
    NO_CHAIN: { label: 'Təsdiq zənciri yoxdur', icon: 'link_off', tone: 'is-neutral' },
    REJECTED: { label: 'Rədd edilib', icon: 'block', tone: 'is-danger' },
    UNKNOWN: { label: 'Naməlum', icon: 'help', tone: 'is-neutral' },
};

/** Filtrdəki mərhələ seçimləri — iş axını sırası ilə */
export const STAGE_OPTIONS: StageCode[] = [
    'INSPECTOR', 'HEAD_INSPECTOR', 'STORE_ANSWER', 'CHAIN_APPROVAL', 'RETURNED', 'CLOSED', 'NO_CHAIN', 'REJECTED',
];

const CHAIN_STAGES: StageCode[] = ['STORE_ANSWER', 'CHAIN_APPROVAL', 'RETURNED'];

export function stageMeta(code: string): StageMeta {
    return STAGE_META[code as StageCode] ?? STAGE_META.UNKNOWN;
}

export interface DisruptionTrackingItem {
    disruptionId: number;
    inspectionPlanId: number;
    firmId: number;
    firmName: string;
    locationCode: number;
    locationName: string;
    regionName: string;
    sectionId: number;
    sectionName: string;
    disruptionCategoryId: number;
    disruptionCategoryName: string;
    disruptionReasonId: number;
    reasonName: string;
    description: string;
    inspectorId: number;
    inspectorName: string;
    createdDate: string;
    planStartDate: string | null;
    deadlineDays: number | null;
    deadlineDate: string | null;
    isOverdue: boolean;
    status: number;
    stageCode: StageCode;
    currentLevel: number | null;
    currentApprovers: string | null;
    stageSince: string | null;
    chainLength: number;
    image: number;
    video: number;
    document: number;
}

export interface DisruptionStageCount {
    stageCode: StageCode;
    total: number;
    overdue: number;
}

export interface DisruptionTrackingData {
    items: DisruptionTrackingItem[];
    total: number;
    stages: DisruptionStageCount[];
}

export interface DisruptionTrackingHeader extends DisruptionTrackingItem {
    planEndDate: string | null;
    questionText: string | null;
}

/** Səviyyənin indiki vəziyyəti və kimə təyin olunduğu — tarixçə `events`-dədir */
export interface DisruptionTrackingStep {
    id: number;
    level: number;
    assignedUserCode: number | null;
    assignedUserName: string | null;
    isCurrent: boolean;
    isReturned: boolean;
    status: number;
}

export type EventAction = 'ANSWERED' | 'CONFIRMED' | 'REJECTED';

/** DisruptionAnswerLogs sətri — sp_ProcessDisruptionApproval-un yazdığı hər əməliyyat */
export interface DisruptionTrackingEvent {
    id: number;
    disruptionAnswerId: number;
    level: number;
    actionType: EventAction | string;
    changedDate: string;
    changedBy: number | null;
    changedByName: string | null;
    assignedUserCode: number;
    assignedUserName: string | null;
    approveStatus: number;
    confirmStatus: number;
    note: string | null;
    returnReason: string | null;
    image: number;
    video: number;
    document: number;
}

export interface DisruptionChainMember {
    level: number;
    userCode: number;
    userName: string;
}

export interface DisruptionTrackingDetail {
    header: DisruptionTrackingHeader;
    steps: DisruptionTrackingStep[];
    chain: DisruptionChainMember[];
    events: DisruptionTrackingEvent[];
}

// ── Cədvəldəki "Kimdədir" və zəncir izi ─────────────────────────────────────

export interface Holder {
    name: string;
    role: string;
}

export function currentHolder(item: DisruptionTrackingItem): Holder | null {
    switch (item.stageCode) {
        case 'INSPECTOR':
            return { name: item.currentApprovers || item.inspectorName, role: 'Müfəttiş' };
        case 'HEAD_INSPECTOR':
            return { name: 'Baş müfəttiş', role: 'Rol üzrə' };
        case 'STORE_ANSWER':
        case 'CHAIN_APPROVAL':
        case 'RETURNED':
            return {
                name: item.currentApprovers || 'Təyin edilməyib',
                role: item.currentLevel ? `${item.currentLevel}-ci təsdiq · ${levelRoleLabel(item.currentLevel)}` : '',
            };
        default:
            return null;
    }
}

export type TrackState = 'done' | 'current' | 'todo' | 'void';

/**
 * Mini zəncir izi: 2 müfəttiş addımı + mağaza zəncirinin səviyyələri.
 * Hər nöqtə bir addımdır; cari addım vurğulanır.
 */
export function stageTrack(item: DisruptionTrackingItem): TrackState[] {
    const total = 2 + Math.max(item.chainLength, item.currentLevel ?? 0);
    let position: number;
    switch (item.stageCode) {
        case 'INSPECTOR': position = 0; break;
        case 'HEAD_INSPECTOR': position = 1; break;
        case 'STORE_ANSWER':
        case 'CHAIN_APPROVAL':
        case 'RETURNED': position = 1 + (item.currentLevel ?? 1); break;
        case 'CLOSED': position = total; break;
        case 'NO_CHAIN': position = 2; break;
        default: return Array.from({ length: total }, () => 'void');
    }
    return Array.from({ length: total }, (_, i) => i < position ? 'done' : i === position ? 'current' : 'todo');
}

// ── Detal panelinin timeline-ı ──────────────────────────────────────────────

export type TimelineState = 'done' | 'current' | 'pending' | 'returned' | 'rejected' | 'skipped';

export interface TimelineEntry {
    who: string;
    verdict: string;
    verdictTone: ChipTone;
    note: string | null;
    returnReason: string | null;
    date: string | null;
    /** Əməliyyatı təyin olunan şəxs yox, başqası edibsə (məs. admin) — kimin adından edildiyi */
    onBehalfOf: string | null;
    /** Cavab faylları üçün DisruptionAnswers.ID (media modulu DisAnswer) */
    answerId: number;
    image: number;
    video: number;
    document: number;
}

export interface TimelineNode {
    title: string;
    subtitle: string;
    state: TimelineState;
    /** Bu addımda kim(lər) cavabdehdir — hələ cavab verilməyibsə göstərilir */
    assignees: string[];
    entries: TimelineEntry[];
    date: string | null;
}

const APPROVE_LABELS: Record<number, [string, ChipTone]> = {
    0: ['Cavab gözlənilir', 'is-neutral'],
    1: ['Həll edildi', 'is-success'],
    2: ['Gözləmədə', 'is-warning'],
    3: ['Razı deyiləm', 'is-danger'],
};

function eventVerdict(e: DisruptionTrackingEvent): [string, ChipTone] {
    switch (e.actionType) {
        case 'REJECTED': return ['Geri qaytardı', 'is-danger'];
        case 'CONFIRMED': return ['Təsdiqlədi', 'is-success'];
        // ANSWERED — mağazanın cavabı ApproveStatus-dadır
        default: return APPROVE_LABELS[e.approveStatus] ?? [e.actionType, 'is-neutral'];
    }
}

function eventEntry(e: DisruptionTrackingEvent): TimelineEntry {
    const [verdict, verdictTone] = eventVerdict(e);
    const actedForOther = e.changedBy != null && e.changedBy !== e.assignedUserCode;
    return {
        who: e.changedByName || (e.changedBy ? `#${e.changedBy}` : '—'),
        verdict,
        verdictTone,
        note: e.note?.trim() || null,
        returnReason: e.returnReason?.trim() || null,
        date: e.changedDate,
        onBehalfOf: actedForOther ? (e.assignedUserName || `#${e.assignedUserCode}`) : null,
        answerId: e.disruptionAnswerId,
        image: e.image,
        video: e.video,
        document: e.document,
    };
}

export function buildTimeline(detail: DisruptionTrackingDetail): TimelineNode[] {
    const h = detail.header;
    const rejected = h.stageCode === 'REJECTED';
    const phaseA = (doneFrom: number, currentAt: number): TimelineState =>
        rejected ? 'skipped' : h.status >= doneFrom ? 'done' : h.status === currentAt ? 'current' : 'pending';

    const nodes: TimelineNode[] = [
        {
            title: 'Uyğunsuzluq yaradıldı',
            subtitle: 'Müfəttiş tərəfindən qeydə alınıb',
            state: 'done',
            assignees: [h.inspectorName],
            entries: [],
            date: h.createdDate,
        },
        {
            title: 'Müfəttişin təsdiqi',
            subtitle: 'Müfəttiş öz qeydini təsdiqləyir',
            state: phaseA(1, 0),
            assignees: [h.inspectorName],
            entries: [],
            date: null,
        },
        {
            title: 'Baş müfəttişin təsdiqi',
            subtitle: 'Yekun təsdiqdən sonra mağaza zənciri başlayır',
            state: phaseA(2, 1),
            assignees: ['Baş müfəttiş'],
            entries: [],
            date: null,
        },
    ];

    if (rejected) {
        nodes.push({
            title: 'Rədd edildi',
            subtitle: 'Uyğunsuzluq müfəttiş mərhələsində rədd edilib',
            state: 'rejected', assignees: [], entries: [], date: null,
        });
        return nodes;
    }

    const events = detail.events ?? [];
    const levels = new Set<number>([
        ...detail.chain.map(c => c.level), ...detail.steps.map(s => s.level), ...events.map(e => e.level),
    ]);
    const chainStarted = h.status === 2;
    const closed = h.stageCode === 'CLOSED';

    [...levels].sort((a, b) => a - b).forEach(level => {
        // Tarixçə logdan gəlir; DisruptionAnswers yalnız indi kimin gözlədiyini göstərir
        const levelEvents = events.filter(e => e.level === level);
        const current = detail.steps.filter(s => s.level === level && s.isCurrent);
        const isCurrentLevel = CHAIN_STAGES.includes(h.stageCode) && h.currentLevel === level;

        let state: TimelineState;
        if (!chainStarted) {
            state = 'pending';
        } else if (isCurrentLevel) {
            state = h.stageCode === 'RETURNED' ? 'returned' : 'current';
        } else if (closed || (h.currentLevel != null && level < h.currentLevel) || levelEvents.length) {
            state = 'done';
        } else {
            state = 'pending';
        }

        nodes.push({
            title: `${level}-ci təsdiq`,
            subtitle: levelRoleLabel(level) + (level === 1 ? ' — mağazanın cavabı' : ''),
            state,
            assignees: current.length
                ? current.map(s => s.assignedUserName || `#${s.assignedUserCode}`)
                : detail.chain.filter(c => c.level === level).map(c => c.userName),
            entries: levelEvents.map(eventEntry),
            date: null,
        });
    });

    if (h.stageCode === 'NO_CHAIN') {
        nodes.push({
            title: 'Təsdiq zənciri yoxdur',
            subtitle: 'Mağaza üçün "Ərazi Bağlantıları" səhifəsində zəncir təyin edilməyib',
            state: 'skipped', assignees: [], entries: [], date: null,
        });
    }

    nodes.push({
        title: 'Bağlandı',
        subtitle: 'Bütün təsdiqlər tamamlanıb',
        state: closed ? 'done' : 'pending',
        assignees: [], entries: [],
        date: closed ? events.filter(e => e.actionType === 'CONFIRMED').slice(-1)[0]?.changedDate ?? null : null,
    });
    return nodes;
}
