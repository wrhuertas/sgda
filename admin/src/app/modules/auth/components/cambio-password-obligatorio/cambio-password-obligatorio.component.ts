import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { URL_SERVICIOS } from 'src/app/config/config';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cambio-password-obligatorio',
  templateUrl: './cambio-password-obligatorio.component.html',
  styleUrls: ['./cambio-password-obligatorio.component.scss']
})
export class CambioPasswordObligatorioComponent implements OnInit {
  newPassword: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;
  user: any = {};

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: ToastrService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener datos del usuario desde localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
      console.log('👤 Usuario:', this.user);
      
      // Verificar que cambio_pass = 1
      if (this.user.cambio_pass !== 1 && this.user.cambio_pass !== '1') {
        console.warn('⚠️ El usuario no necesita cambiar contraseña');
        this.router.navigate(['/dashboard']);
      }
    }
  }

  /**
   * Validar que las contraseñas sean válidas
   */
  isPasswordValid(): boolean {
    return (
      this.newPassword === this.confirmPassword && 
      this.newPassword.length >= 6
    );
  }

  /**
   * Verificar en tiempo real si las contraseñas coinciden
   */
  checkPasswords(): boolean {
    return (
      this.newPassword.length >= 6 && 
      this.newPassword === this.confirmPassword
    );
  }

  /**
   * Mensaje de validación en tiempo real
   */
  getPasswordMessage(): string {
    if (this.newPassword.length > 0 && this.newPassword.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres ⛔';
    }
    if (this.confirmPassword.length === 0) {
      return '';
    }
    return this.checkPasswords()
      ? 'Las contraseñas coinciden ✅'
      : 'Las contraseñas no coinciden ❌';
  }

  /**
   * Guardar la nueva contraseña
   */
  save(): void {
    if (!this.isPasswordValid()) {
      this.toast.error('Error', 'Las contraseñas no coinciden o son muy cortas');
      return;
    }

    this.isLoading = true;

    const payload = {
      userId: this.user.id,
      newPassword: this.newPassword,
      cambio_pass: 0 // Marcar que ya cambió la contraseña
    };

    // 🔑 Obtener el token del localStorage
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.post(
      URL_SERVICIOS + '/usuarios/cambiar-password-obligatorio',
      payload,
      { headers }
    ).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        if (response.message === 200 || response.success) {
          // Mostrar SweetAlert2 de éxito
          Swal.fire({
            title: '¡Perfecto!',
            text: 'Tu contraseña se ha actualizado correctamente. Por favor inicia sesión de nuevo.',
            icon: 'success',
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: false,
          }).then(() => {
            // Cerrar sesión y redirigir al login
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          });
        } else {
          this.toast.error('Error', response.message_text || 'Error al cambiar la contraseña');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Error al cambiar contraseña:', error);
        this.toast.error('Error', 'Hubo un problema al cambiar la contraseña');
      }
    });
  }

  /**
   * Cerrar sesión sin cambiar contraseña
   */
  logout(): void {
    Swal.fire({
      title: 'Advertencia',
      text: 'Debes cambiar tu contraseña para acceder al sistema. ¿Deseas cerrar sesión?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
