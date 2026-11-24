import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnswerApproveComponent } from './answer-approve.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('AnswerApproveComponent', () => {
  let component: AnswerApproveComponent;
  let fixture: ComponentFixture<AnswerApproveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
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
