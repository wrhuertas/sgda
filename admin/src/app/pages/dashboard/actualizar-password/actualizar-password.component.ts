import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import Swal from 'sweetalert2';
import { DashboardService } from '../service/dashboard.service';

@Component({
  selector: 'app-actualizar-password',
  templateUrl: './actualizar-password.component.html',
  styleUrls: ['./actualizar-password.component.scss']
})
export class ActualizarPasswordComponent {
 @Output() UserA: EventEmitter<any> = new EventEmitter();
  @Input() user: any = {}; // Recibe el usuario desde el componente padre
  @Output() passwordUpdated = new EventEmitter<any>(); // Emitir evento cuando la contraseña se actualice

  @Input() userId: number; // Recibir el ID del usuario como input
  @Input() role_id: number; // Recibimos el role_id
  newPassword: string = '';
  confirmPassword: string = '';
  isLoading: any;

  constructor(
    private auth: AuthService,
    public modal: NgbActiveModal,
    public modalService: NgbModal,
    public dashboardService: DashboardService,
    public toast: ToastrService
  ) {}

  logout() {
    this.auth.logout(); // Llama al servicio de autenticación para cerrar sesión
    document.location.reload(); // Recarga la página para asegurarse de que se limpie la sesión
  }
  // Validar que las contraseñas coincidan
  isPasswordValid(): boolean {
    return (
      this.newPassword === this.confirmPassword && this.newPassword.length > 0
    );
  }

  checkPasswords(): boolean {
    return (
      this.newPassword.length >= 6 && this.newPassword === this.confirmPassword
    );
  }

  getPasswordMessage(): string {
    if (this.newPassword.length > 0 && this.newPassword.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres ⛔';
    }
    if (this.confirmPassword.length === 0) {
      return ''; // No mostrar nada si aún no han escrito
    }
    return this.checkPasswords()
      ? 'Las contraseñas coinciden ✅'
      : 'Las contraseñas no coinciden ❌';
  }

  // Lógica para guardar los datos del usuario
  store() {
    if (!this.isPasswordValid()) {
      this.toast.error('Error', 'Las contraseñas no coinciden');
      return;
    }

    let data = {
      userId: this.userId,
      role_id: Array.isArray(this.role_id) ? this.role_id[0] : this.role_id,
      newPassword: this.newPassword,
    };

    console.log('Datos a enviar desde Angular:', data);

    this.dashboardService.updateUser(this.userId.toString(), data).subscribe(
      (resp: any) => {
        console.log('Respuesta del servidor:', resp);
        if (resp.message === 403) {
          this.toast.error('Validación', resp.message_text);
        } else if (resp.message === 200) {
          // Mostrar SweetAlert2 con botón OK
          Swal.fire({
            title: '¡Perfecto!',
            text: 'Las contraseñas se actualizaron correctamente. Tiene que iniciar sesión de nuevo.',
            icon: 'success',
            confirmButtonText: 'OK', // Botón de confirmación
            allowOutsideClick: false, // Evita cerrar al hacer clic fuera
            allowEscapeKey: false, // Evita cerrar con la tecla ESC
            allowEnterKey: false, // Evita cerrar con ENTER
          }).then(() => {
            // Emitir el usuario actualizado después de cerrar la alerta
            this.UserA.emit(resp.user);
            this.modal.close(); // Cerrar el modal

            // Cerrar sesión después de que el usuario haga clic en "OK"
            this.logout();
          });
        }
      },
      (error) => {
        this.toast.error(
          'Error',
          'Hubo un problema al actualizar la contraseña'
        );
        console.error('Error al actualizar la contraseña:', error);
      }
    );
  }
}
