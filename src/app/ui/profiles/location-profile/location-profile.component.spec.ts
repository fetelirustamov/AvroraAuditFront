import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { LocationProfileComponent } from './location-profile.component';

describe('LocationProfileComponent', () => {
  let component: LocationProfileComponent;
  let fixture: ComponentFixture<LocationProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationProfileComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocationProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
