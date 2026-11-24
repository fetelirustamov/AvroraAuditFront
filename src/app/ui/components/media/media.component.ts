import { Component, Input, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MediaType, Module } from './media-type.enum';
import { MediaViewerComponent, MediaViewerData } from './media-viewer/media-viewer.component';

/** `[media-trigger]` elementi `open()` çağırır — fayllar tam ekran baxışda göstərilir */
@Component({
  selector: 'app-media',
  standalone: true,
  templateUrl: './media.component.html',
})
export class MediaComponent {
  @Input() id!: number;
  @Input() type!: MediaType;
  @Input() module!: Module;

  private readonly dialog = inject(MatDialog);

  open() {
    this.dialog.open<MediaViewerComponent, MediaViewerData>(MediaViewerComponent, {
      data: { id: this.id, type: this.type, module: this.module },
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      panelClass: 'media-viewer-panel',
      backdropClass: 'media-viewer-backdrop',
      enterAnimationDuration: '160ms',
      exitAnimationDuration: '120ms',
    });
  }
}
