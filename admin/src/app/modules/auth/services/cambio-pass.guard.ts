import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CambioPassGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // 1️⃣ Obtener el usuario del localStorage
    const userData = localStorage.getItem('user');
    
    if (!userData) {
      return true; // No hay usuario, dejar pasar
    }

    try {
      const user = JSON.parse(userData);
      
      // 2️⃣ Si cambio_pass = 1, el usuario DEBE cambiar su contraseña
      if (user.cambio_pass === 1 || user.cambio_pass === '1') {
        console.warn('⚠️ Usuario debe cambiar contraseña obligatoriamente');
        // Redirigir al formulario de cambio obligatorio
        this.router.navigate(['/auth/cambio-password-obligatorio']);
        return false;
      }

      // ✅ El usuario ya cambió su contraseña, permitir acceso
      return true;
    } catch (error) {
      console.error('Error al parsear usuario:', error);
      return true; // En caso de error, permitir acceso
    }
  }
}
