import { Component, EventEmitter, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { UsersService } from '../../users/service/users.service';

@Component({
  selector: 'app-create-super-usuario',
  templateUrl: './create-super-usuario.component.html',
  styleUrls: ['./create-super-usuario.component.scss']
})
export class CreateSuperUsuarioComponent {

  @Output() SuperUsuarioC: EventEmitter<any> = new EventEmitter();

  name: string = '';
  surname: string = '';
  email: string = '';
  password: string = '';
  passwordConfirmation: string = '';
  estado: number = 1;
  guardando: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    private toast: ToastrService,
    private usersService: UsersService
  ) {}

  guardar(): void {
    if (!this.name || !this.email) {
      this.toast.error('Nombre y correo son requeridos', 'Validación');
      return;
    }
    if (!this.password || this.password.length < 6) {
      this.toast.error('La contraseña es requerida (mínimo 6 caracteres)', 'Validación');
      return;
    }
    if (this.password !== this.passwordConfirmation) {
      this.toast.error('Las contraseñas no coinciden', 'Validación');
      return;
    }

    const data = {
      name: this.name,
      surname: this.surname,
      email: this.email,
      password: this.password,
      estado: this.estado
    };

    this.guardando = true;
    this.usersService.createSuperUsuario(data).subscribe({
      next: (resp: any) => {
        this.guardando = false;
        this.toast.success('Super Usuario creado correctamente', 'Éxito');
        this.SuperUsuarioC.emit(resp?.user || null);
        this.modal.close();
      },
      error: (err: any) => {
        this.guardando = false;
        const msg = err?.error?.errors?.email?.[0]
          || err?.error?.message
          || 'No se pudo crear el Super Usuario';
        this.toast.error(msg, 'Error');
      }
    });
  }
}
