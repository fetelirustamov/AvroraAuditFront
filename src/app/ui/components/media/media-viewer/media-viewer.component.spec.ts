import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MediaViewerComponent, MediaViewerData } from './media-viewer.component';
import { MediaType, Module } from '../media-type.enum';
import { appTestProviders } from '../../../../../testing/test-providers';

describe('MediaViewerComponent', () => {
  let component: MediaViewerComponent;
  let fixture: ComponentFixture<MediaViewerComponent>;

  beforeEach(async () => {
    const data: MediaViewerData = { id: 0, type: MediaType.Image, module: Module.Disruption };
    await TestBed.configureTestingModule({
      providers: [
        appTestProviders,
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
      imports: [MediaViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MediaViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('never scales an image above its natural size', () => {
    component.stage.set({ w: 1920, h: 1000 });
    component.natural.set({ w: 640, h: 480 });
    expect(component.fitScale()).toBe(1);
  });

  it('swaps dimensions when rotated a quarter turn', () => {
    component.stage.set({ w: 1048, h: 648 });
    component.natural.set({ w: 4000, h: 3000 });
    const landscape = component.fitScale();
    component.rotation.set(90);
    expect(component.fitScale()).toBeLessThan(landscape);
    expect(component.fitScale()).toBeCloseTo(600 / 4000);
  });
});
