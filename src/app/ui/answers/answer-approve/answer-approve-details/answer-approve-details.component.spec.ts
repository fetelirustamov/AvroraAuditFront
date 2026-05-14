import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnswerApproveDetailsComponent } from './answer-approve-details.component';

describe('AnswerApproveDetailsComponent', () => {
  let component: AnswerApproveDetailsComponent;
  let fixture: ComponentFixture<AnswerApproveDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnswerApproveDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnswerApproveDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
