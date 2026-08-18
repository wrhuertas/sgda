import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { UsersService } from '../../users/service/users.service';

@Component({
  selector: 'app-delete-super-usuario',
  templateUrl: './delete-super-usuario.component.html',
  styleUrls: ['./delete-super-usuario.component.scss']
})
export class DeleteSuperUsuarioComponent {

  @Input() SUPER_USUARIO_SELECTED: any;
  @Output() SuperUsuarioD: EventEmitter<any> = new EventEmitter();

  eliminando: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    private toast: ToastrService,
    private usersService: UsersService
  ) {}

  eliminar(): void {
    if (!this.SUPER_USUARIO_SELECTED?.id) {
      this.toast.error('No se pudo identificar el Super Usuario', 'Error');
      return;
    }

    this.eliminando = true;
    this.usersService.deleteSuperUsuario(this.SUPER_USUARIO_SELECTED.id).subscribe({
      next: () => {
        this.eliminando = false;
        this.toast.success('Super Usuario eliminado correctamente', 'Éxito');
        this.SuperUsuarioD.emit(this.SUPER_USUARIO_SELECTED.id);
        this.modal.close();
      },
      error: (err: any) => {
        this.eliminando = false;
        const msg = err?.error?.message_text
          || err?.error?.message
          || 'No se pudo eliminar el Super Usuario';
        this.toast.error(msg, 'Error');
      }
    });
  }
}
