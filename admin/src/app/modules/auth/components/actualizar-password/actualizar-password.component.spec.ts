import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActualizarPasswordComponent } from './actualizar-password.component';

describe('ActualizarPasswordComponent', () => {
  let component: ActualizarPasswordComponent;
  let fixture: ComponentFixture<ActualizarPasswordComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ActualizarPasswordComponent]
    });
    fixture = TestBed.createComponent(ActualizarPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
