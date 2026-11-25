import { Component, DestroyRef, ElementRef, HostListener, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize, forkJoin, map } from 'rxjs';
import { ComponentService } from '../../component.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { environment } from '../../../../../environments/environment';
import { MediaType, Module } from '../media-type.enum';

export interface MediaViewerData {
  id: number;
  type: MediaType;
  module: Module;
}

interface Point { x: number; y: number; }
interface Size { w: number; h: number; }

// Çek-list sualından yaranan uyğunsuzluğun faylları ChecklistDisruption modulu ilə saxlanılır,
// amma eyni Disruptions.ID-yə bağlıdır — uyğunsuzluq mediası hər iki moduldan oxunur
const STORAGE_MODULES: Partial<Record<Module, Module[]>> = {
  [Module.Disruption]: [Module.Disruption, Module.ChecklistDisruption],
};

/** Şəklin səhnə kənarından minimum məsafəsi (px) */
const GUTTER = 24;
const ZOOM_STEP = 1.5;
const SWIPE_DISTANCE = 60;

/**
 * Tam ekran media baxışı. Şəkil ekrana sığdırılır, amma real ölçüsündən heç vaxt
 * böyüdülmür (`fitScale ≤ 1`) — mobil fotolar 5184×3880 olduğundan detal zoom ilə görünür.
 *
 * Ölçək `width/height` ilə verilir (brauzer kəskin kiçildir), sürüşdürmə və döndərmə
 * isə `transform` ilə. Panzoom tipli kitabxana elementin transform-unu özü idarə etdiyi
 * üçün döndərmə + sığdırma hesabı ilə birləşmir.
 */
@Component({
  selector: 'app-media-viewer',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './media-viewer.component.html',
  styleUrl: './media-viewer.component.scss',
})
export class MediaViewerComponent {
  private readonly data = inject<MediaViewerData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MediaViewerComponent>);
  private readonly componentService = inject(ComponentService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stageRef = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly stripRef = viewChild<ElementRef<HTMLElement>>('strip');

  readonly MediaType = MediaType;
  readonly type = this.data.type;
  readonly kindLabel = { [MediaType.Image]: 'Şəkil', [MediaType.Video]: 'Video', [MediaType.Document]: 'Sənədlər' }[this.type];

  readonly items = signal<string[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly index = signal(0);
  readonly failed = signal<ReadonlySet<string>>(new Set());
  readonly downloading = signal<string | null>(null);

  readonly current = computed(() => this.items()[this.index()] ?? null);
  // `@for ... track url` ilə hər fayl üçün yeni element yaradılır — əvvəlki şəklin ölçüsü/keçidi yenisinə keçmir
  readonly currentList = computed(() => this.current() ? [this.current()!] : []);
  readonly isMulti = computed(() => this.type !== MediaType.Document && this.items().length > 1);

  // ── Şəkil görünüşü ──────────────────────────────────────────────────────
  readonly natural = signal<Size | null>(null);
  readonly stage = signal<Size>({ w: 0, h: 0 });
  readonly rotation = signal(0);
  readonly fitted = signal(true);
  private readonly scale = signal(1);
  readonly offset = signal<Point>({ x: 0, y: 0 });
  readonly interacting = signal(false);

  readonly canTransform = computed(() => {
    const url = this.current();
    return this.type === MediaType.Image && !!url && !!this.natural() && !this.failed().has(url);
  });

  private readonly rotatedSize = computed<Size | null>(() => {
    const n = this.natural();
    if (!n) return null;
    return this.rotation() % 180 === 0 ? n : { w: n.h, h: n.w };
  });

  readonly fitScale = computed(() => {
    const r = this.rotatedSize();
    const s = this.stage();
    if (!r || !s.w || !s.h) return 1;
    return Math.max(0.01, Math.min(1, (s.w - 2 * GUTTER) / r.w, (s.h - 2 * GUTTER) / r.h));
  });

  private readonly maxScale = computed(() => Math.max(2, this.fitScale() * 4));
  private readonly displayScale = computed(() => this.fitted() ? this.fitScale() : this.scale());
  readonly atMax = computed(() => this.displayScale() >= this.maxScale() - 1e-4);

  readonly imageStyle = computed(() => {
    const n = this.natural();
    if (!n) return {};
    const s = this.displayScale();
    const o = this.offset();
    return {
      width: `${n.w * s}px`,
      height: `${n.h * s}px`,
      transform: `translate(-50%, -50%) translate(${o.x}px, ${o.y}px) rotate(${this.rotation()}deg)`,
    };
  });

  private readonly pointers = new Map<number, Point>();
  private pinchStart: { distance: number; scale: number } | null = null;
  private swipeStart: Point | null = null;
  private wheelTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.fetchMedia();

    afterNextRender(() => {
      const observer = new ResizeObserver(([entry]) =>
        this.stage.set({ w: entry.contentRect.width, h: entry.contentRect.height }));
      observer.observe(this.stageRef().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.wheelTimer));

    // Aktiv miniatür zolaqda görünən sahəyə gətirilir
    effect(() => {
      const track = this.stripRef()?.nativeElement.firstElementChild;
      track?.children[this.index()]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
  }

  // Hər modulun faylları ayrıca sorğulanır, çünki backend onları ayrı qovluqlarda saxlayır
  private fetchMedia() {
    const { id, type, module } = this.data;
    if (id == null || id <= 0) {
      this.loading.set(false);
      return;
    }
    const modules = STORAGE_MODULES[module] ?? [module];
    forkJoin(modules.map(m => this.componentService.GetMedia(id, m).pipe(
      map(names => (names || []).map(name => `${environment.mediaUrl}/${MediaType[type]}/${Module[m]}/${name}`))
    ))).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: lists => this.items.set(lists.flat()),
      error: () => this.loadError.set(true),
    });
  }

  close() {
    this.dialogRef.close();
  }

  // ── Naviqasiya ──────────────────────────────────────────────────────────
  select(i: number) {
    if (i === this.index()) return;
    this.index.set(i);
    this.natural.set(null);
    this.rotation.set(0);
    this.fit();
  }

  next() {
    const count = this.items().length;
    if (count > 1) this.select((this.index() + 1) % count);
  }

  prev() {
    const count = this.items().length;
    if (count > 1) this.select((this.index() - 1 + count) % count);
  }

  // ── Fayl vəziyyəti ──────────────────────────────────────────────────────
  onImageLoad(img: HTMLImageElement) {
    this.natural.set({ w: img.naturalWidth, h: img.naturalHeight });
  }

  markFailed(url: string) {
    this.failed.update(set => new Set(set).add(url));
  }

  fileName(url: string): string {
    return decodeURIComponent(url.split('/').pop() ?? url);
  }

  fileExtension(url: string): string {
    return this.fileName(url).split('.').pop()?.toLowerCase() ?? '';
  }

  fileIcon(url: string): string {
    const ext = this.fileExtension(url);
    if (ext === 'pdf') return 'picture_as_pdf';
    if (['doc', 'docx'].includes(ext)) return 'description';
    if (['xls', 'xlsx'].includes(ext)) return 'table_chart';
    return 'attach_file';
  }

  // Media başqa origin-dədir, ona görə `<a download>` faylı sadəcə açardı — blob kimi götürülür.
  // `no-store`: <img> eyni faylı CORS-suz keşləyir və keşdən gələn cavab CORS sorğusunda rədd olunur.
  // Statik fayl token tələb etmir — HttpClient-in Authorization başlığı lazımsız preflight yaradardı.
  async download(url: string) {
    if (this.downloading()) return;
    this.downloading.set(url);
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(await response.blob());
      link.download = this.fileName(url);
      link.click();
      // Bəzi brauzerlər yükləməni click-dən sonra başladır — URL dərhal ləğv edilmir
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch {
      this.notify.error('Fayl yüklənmədi');
    } finally {
      this.downloading.set(null);
    }
  }

  // ── Zoom / döndərmə ─────────────────────────────────────────────────────
  rotate(delta: number) {
    if (!this.canTransform()) return;
    this.rotation.update(r => r + delta);
    this.fit();
  }

  fit() {
    this.fitted.set(true);
    this.offset.set({ x: 0, y: 0 });
  }

  zoomIn() {
    if (this.canTransform()) this.zoomTo(this.displayScale() * ZOOM_STEP);
  }

  zoomOut() {
    if (this.canTransform()) this.zoomTo(this.displayScale() / ZOOM_STEP);
  }

  /** `point` — səhnə mərkəzinə nisbətən; həmin nöqtədəki piksel zoom-dan sonra yerində qalır */
  private zoomTo(target: number, point: Point = { x: 0, y: 0 }) {
    const fit = this.fitScale();
    const next = Math.min(this.maxScale(), Math.max(fit, target));
    if (next <= fit + 1e-4) {
      this.fit();
      return;
    }
    const ratio = next / this.displayScale();
    const o = this.offset();
    this.scale.set(next);
    this.fitted.set(false);
    this.offset.set(this.clamp({ x: point.x - (point.x - o.x) * ratio, y: point.y - (point.y - o.y) * ratio }, next));
  }

  /** Böyüdülmüş şəklin kənarı səhnənin içinə girməsin */
  private clamp(o: Point, scale: number): Point {
    const r = this.rotatedSize();
    if (!r) return o;
    const s = this.stage();
    const maxX = Math.max(0, (r.w * scale - s.w) / 2);
    const maxY = Math.max(0, (r.h * scale - s.h) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  }

  private toStagePoint(clientX: number, clientY: number, el: HTMLElement): Point {
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  }

  onWheel(e: WheelEvent) {
    if (!this.canTransform()) return;
    e.preventDefault();
    // deltaMode 1 — sətir (Firefox), piksələ çevrilir
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    this.interacting.set(true);
    clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => this.interacting.set(false), 150);
    this.zoomTo(this.displayScale() * Math.exp(-delta * 0.0015),
      this.toStagePoint(e.clientX, e.clientY, e.currentTarget as HTMLElement));
  }

  onDoubleClick(e: MouseEvent) {
    if (!this.canTransform()) return;
    if (this.fitted()) {
      this.zoomTo(Math.max(1, this.fitScale() * 2), this.toStagePoint(e.clientX, e.clientY, e.currentTarget as HTMLElement));
    } else {
      this.fit();
    }
  }

  onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.interacting.set(true);
    this.swipeStart = this.pointers.size === 1 && e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY } : null;
    if (this.pointers.size === 2) {
      this.pinchStart = { distance: this.pointerDistance(), scale: this.displayScale() };
    }
  }

  onPointerMove(e: PointerEvent) {
    const prev = this.pointers.get(e.pointerId);
    if (!prev || !this.canTransform()) return;
    const cur = { x: e.clientX, y: e.clientY };
    this.pointers.set(e.pointerId, cur);

    if (this.pinchStart && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const mid = this.toStagePoint((a.x + b.x) / 2, (a.y + b.y) / 2, e.currentTarget as HTMLElement);
      this.zoomTo(this.pinchStart.scale * this.pointerDistance() / this.pinchStart.distance, mid);
    } else if (!this.fitted()) {
      const o = this.offset();
      this.offset.set(this.clamp({ x: o.x + cur.x - prev.x, y: o.y + cur.y - prev.y }, this.displayScale()));
    }
  }

  onPointerUp(e: PointerEvent) {
    const start = this.swipeStart;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchStart = null;
    if (this.pointers.size > 0) return;
    this.interacting.set(false);
    this.swipeStart = null;

    // Sığdırılmış vəziyyətdə barmaqla üfüqi sürüşdürmə növbəti/əvvəlki fayla keçir
    if (start && this.fitted()) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
        dx < 0 ? this.next() : this.prev();
      }
    }
  }

  private pointerDistance(): number {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    // Video idarəsində oxlar videonu irəli-geri çəkir
    if (e.ctrlKey || e.metaKey || e.altKey || e.target instanceof HTMLVideoElement) return;
    switch (e.key) {
      case 'ArrowLeft': this.prev(); break;
      case 'ArrowRight': this.next(); break;
      case '+': case '=': this.zoomIn(); break;
      case '-': this.zoomOut(); break;
      case '0': this.fit(); break;
      case 'r': case 'R': this.rotate(90); break;
      default: return;
    }
    e.preventDefault();
  }
}
