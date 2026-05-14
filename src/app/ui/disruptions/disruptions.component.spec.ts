import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisruptionsComponent } from './disruptions.component';

describe('DisruptionsComponent', () => {
  let component: DisruptionsComponent;
  let fixture: ComponentFixture<DisruptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisruptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisruptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
