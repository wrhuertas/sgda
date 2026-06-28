import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // 1️⃣ Si no hay usuario o token, llamamos a logout y bloqueamos acceso
    if (!this.authService.user || !this.authService.token) {
      this.authService.logout(); // Aquí debes avisar al backend si quieres registrar LOGOUT
      return false;
    }

    // 2️⃣ Revisar expiración del token
    const token = this.authService.token;
    const expiration = JSON.parse(atob(token.split('.')[1])).exp;

    if (Math.floor(new Date().getTime() / 1000) >= expiration) {
      this.authService.logout(); // Token expirado → forzar logout
      return false;
    }

    // ✅ Token válido, usuario válido → permitir acceso
    return true;
  }
}
