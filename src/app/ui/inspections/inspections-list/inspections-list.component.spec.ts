import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectionsListComponent } from './inspections-list.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('InspectionsListComponent', () => {
  let component: InspectionsListComponent;
  let fixture: ComponentFixture<InspectionsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [InspectionsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectionsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
