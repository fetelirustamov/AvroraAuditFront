import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnswerApproveComponent } from './answer-approve.component';

describe('AnswerApproveComponent', () => {
  let component: AnswerApproveComponent;
  let fixture: ComponentFixture<AnswerApproveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnswerApproveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnswerApproveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
