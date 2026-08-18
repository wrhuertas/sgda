import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { UsersService } from '../../users/service/users.service';

@Component({
  selector: 'app-edit-super-usuario',
  templateUrl: './edit-super-usuario.component.html',
  styleUrls: ['./edit-super-usuario.component.scss']
})
export class EditSuperUsuarioComponent implements OnInit {

  @Input() SUPER_USUARIO_SELECTED: any;
  @Output() SuperUsuarioE: EventEmitter<any> = new EventEmitter();

  id: any = null;
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

  ngOnInit(): void {
    if (this.SUPER_USUARIO_SELECTED) {
      this.id = this.SUPER_USUARIO_SELECTED.id ?? null;
      this.name = this.SUPER_USUARIO_SELECTED.name ?? '';
      this.surname = this.SUPER_USUARIO_SELECTED.surname ?? '';
      this.email = this.SUPER_USUARIO_SELECTED.email ?? '';
      this.estado = this.SUPER_USUARIO_SELECTED.estado ?? 1;
    }
  }

  actualizar(): void {
    if (!this.name || !this.email) {
      this.toast.error('Nombre y correo son requeridos', 'Validación');
      return;
    }
    if (this.password && this.password.length < 6) {
      this.toast.error('La contraseña debe tener al menos 6 caracteres', 'Validación');
      return;
    }
    if (this.password && this.password !== this.passwordConfirmation) {
      this.toast.error('Las contraseñas no coinciden', 'Validación');
      return;
    }

    const data: any = {
      name: this.name,
      surname: this.surname,
      email: this.email,
      estado: this.estado
    };
    // Solo enviar contraseña si el usuario escribió una nueva
    if (this.password) {
      data.password = this.password;
    }

    this.guardando = true;
    this.usersService.updateSuperUsuario(this.id, data).subscribe({
      next: (resp: any) => {
        this.guardando = false;
        this.toast.success('Super Usuario actualizado correctamente', 'Éxito');
        this.SuperUsuarioE.emit(resp?.user || null);
        this.modal.close();
      },
      error: (err: any) => {
        this.guardando = false;
        const msg = err?.error?.errors?.email?.[0]
          || err?.error?.message
          || 'No se pudo actualizar el Super Usuario';
        this.toast.error(msg, 'Error');
      }
    });
  }
}
