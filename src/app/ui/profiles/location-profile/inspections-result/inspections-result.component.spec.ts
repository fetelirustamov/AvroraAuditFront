import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectionsResultComponent } from './inspections-result.component';
import { appTestProviders } from '../../../../../testing/test-providers';

describe('InspectionsResultComponent', () => {
  let component: InspectionsResultComponent;
  let fixture: ComponentFixture<InspectionsResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [InspectionsResultComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectionsResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
