import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhongTuyenSinhComponent } from './phong-tuyen-sinh.component';

describe('PhongTuyenSinhComponent', () => {
  let component: PhongTuyenSinhComponent;
  let fixture: ComponentFixture<PhongTuyenSinhComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PhongTuyenSinhComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhongTuyenSinhComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
