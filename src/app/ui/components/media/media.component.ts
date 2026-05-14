import { Component, input, Input, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MediaType, Module } from './media-type.enum';
import { ComponentService } from '../component.service';
import { environment } from '../../../../environments/environment';
import { NgFor, NgIf } from '@angular/common';
import { state, style, trigger } from '@angular/animations';


const IMAGE_URL = `${environment.mediaUrl}/Image/`;
const DOCUMENT_URL = `${environment.mediaUrl}/Document/`;

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [MatDialogModule, NgIf, NgFor],
  animations: [
    // Each unique animation requires its own trigger. The first argument of the trigger function is the name
    trigger('rotatedState', [
      state('default', style({ transform: 'rotate(0)' })),
      state('rotatedLeft', style({ transform: 'rotate(-90deg)' })),
      state('rotatedRight', style({ transform: 'rotate(90deg)' })),
      state('rotatedLeft2', style({ transform: 'rotate(-180deg)' })),
      state('rotatedRight2', style({ transform: 'rotate(180deg)' })),
    ])
  ],
  templateUrl: './media.component.html',
  styleUrl: './media.component.scss'
})
export class MediaComponent {
  // @Input() images: string[] = [];
  // @Input() videos: string[] = [];
  @Input() id!: number;
  @Input() type!: MediaType;
  @Input() module!: Module;
  @Input() preloadedImages: string[] = [];
  @ViewChild('mediaModalTemplate') mediaModalTemplate!: TemplateRef<any>;
  public images: string[] = [];
  public videos: string[] = [];
  public documents: string[] = [];
  currentImageIndex: number = 0;
  isOpen = false;

  media_url!: string;
  document_url: string = DOCUMENT_URL;
  public imageError: boolean = false;

  public state: string = 'default';

  constructor(public dialog: MatDialog, private componentService: ComponentService) { }

  open() {
    this.currentImageIndex = 0;
    this.imageError = false;
    this.images = [];
    this.videos = [];
    this.documents = [];

    if (this.preloadedImages.length > 0) {
      this.setMediaUrlByModule();
      this.images = this.preloadedImages;
    } else if (this.id != null && this.id > 0 && this.type !== undefined) {
      this.fetchMediaByIdType(this.id, this.type, this.module);
    } else {
      this.imageError = true;
    }

    this.isOpen = true;
    this.dialog.open(this.mediaModalTemplate, {
      width: '750px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'media-viewer-dialog',
    });
  }

  private setMediaUrlByModule() {
    if (this.module === Module.DisAnswer) {
      this.media_url = IMAGE_URL + 'DisAnswer/';
    } else if (this.module === Module.Checklist) {
      this.media_url = IMAGE_URL + 'Checklist/';
    } else if (this.module === Module.Disruption) {
      this.media_url = IMAGE_URL + 'disruption/';
    } else {
      this.media_url = IMAGE_URL + 'Default/';
    }
  }

  fetchMediaByIdType(id: number, type: MediaType, module: Module) {
    switch (type) {
      case MediaType.Image:
        if (module == Module.DisAnswer) {
          this.media_url = IMAGE_URL + `DisAnswer/`;
        } else if (module == Module.Checklist) {
          this.media_url = IMAGE_URL + `Checklist/`;
        } else if (module == Module.Disruption) {
          this.media_url = IMAGE_URL + `disruption/`;
        } else {
          this.media_url = IMAGE_URL + `Default/`;
        }
        this.documents = [];
        this.videos = [];
        this.componentService.GetMedia(id, module).subscribe((x: string[]) => {
          this.images = x ?? [];
          if (!x || x.length === 0) this.imageError = true;
        });
        break;

      case MediaType.Video:
        this.images = [];
        this.documents = [];
        this.componentService.GetMedia(id, module).subscribe((x: string[]) => {
          this.videos = x ?? [];
          if (!x || x.length === 0) this.imageError = true;
        });
        break;

      case MediaType.Document:
        this.images = [];
        this.videos = [];
        if (module == Module.Disruption) {
          this.document_url = DOCUMENT_URL + `disruption/`;
        } else if (module == Module.DisAnswer) {
          this.document_url = DOCUMENT_URL + `DisAnswer/`;
        } else {
          this.document_url = DOCUMENT_URL + `Default/`;
        }
        this.componentService.GetDocuments(id, module).subscribe((x: string[]) => {
          this.documents = x ?? [];
          if (!x || x.length === 0) this.imageError = true;
        });
        break;

      default:
        this.images = [];
        this.videos = [];
        this.documents = [];
    }
  }

  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() ?? '';
  }

  getFileIcon(fileName: string): string {
    const ext = this.getFileExtension(fileName);
    if (['pdf'].includes(ext)) return 'picture_as_pdf';
    if (['doc', 'docx'].includes(ext)) return 'description';
    if (['xls', 'xlsx'].includes(ext)) return 'table_chart';
    return 'attach_file';
  }

  close() {
    this.dialog.closeAll();
    this.isOpen = false;
  }

  get currentImage(): string | null {
    if (this.images.length > 0) {
      return this.images[this.currentImageIndex];
    }
    return null;
  }

  nextImage() {
    if (this.images.length > 0) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
      this.imageError = false;
    }
  }

  prevImage() {
    if (this.images.length > 0) {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
      this.imageError = false;
    }
  }

  onImageError() {
    this.imageError = true;
    this.images = [];
  }

  get MEDIA(): string {
    return this.media_url;
  }


  rotateLeft() {
    switch (this.state) {

      case "default":
        this.state = "rotatedLeft"
        break;
      case "rotatedLeft":
        this.state = "rotatedLeft2"
        break;
      case "rotatedLeft2":
        this.state = "rotatedRight"
        break;
      default:
        this.state = "default"
        break;
    }
  }

  rotateRight() {
    switch (this.state) {
      case "default":
        this.state = "rotatedRight"
        break;
      case "rotatedRight":
        this.state = "rotatedRight2"
        break;
      case "rotatedRight2":
        this.state = "rotatedLeft"
        break;
      default:
        this.state = "default"
        break;
    }

  }

}
