import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionsComponent } from './sections.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('SectionsComponent', () => {
  let component: SectionsComponent;
  let fixture: ComponentFixture<SectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [SectionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
