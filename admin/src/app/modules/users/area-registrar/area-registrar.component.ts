import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { UsersService } from '../service/users.service';


@Component({
  selector: 'app-area-registrar',
  templateUrl: './area-registrar.component.html',
  styleUrls: ['./area-registrar.component.scss']
})
export class AreaRegistrarComponent {

  // 🔹 RECIBE ID EMPRESA
  @Input() id_empresa!: number;

  // 🔹 DEVUELVE EL ÁREA CREADA
  @Output() UserC = new EventEmitter<any>();

  nombre: string = '';
  isLoading: boolean = false;

  constructor(
    public activeModal: NgbActiveModal,
   public usersService: UsersService,
    private toast: ToastrService
  ) {}

  guardarArea() {
    if (!this.nombre) {
      this.toast.warning('Ingrese el nombre del área');
      return;
    }

    const data = {
      nombre: this.nombre,
      id_empresa: this.id_empresa
    };

    this.isLoading = true;

    this.usersService.registarArea(data).subscribe({
      next: (area) => {
        this.toast.success('Área registrada correctamente');
        this.UserC.emit(area);   // 👈 ENVÍA ÁREA AL PADRE
        this.activeModal.close();
      },
      error: () => {
        this.toast.error('Error al registrar el área');
        this.isLoading = false;
      }
    });
  }

  cerrar() {
    this.activeModal.dismiss();
  }
}
