import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationStructureComponent } from './location-structure.component';

describe('LocationStructureComponent', () => {
  let component: LocationStructureComponent;
  let fixture: ComponentFixture<LocationStructureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationStructureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocationStructureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
