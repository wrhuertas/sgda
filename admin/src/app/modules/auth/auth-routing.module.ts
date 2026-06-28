import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthComponent } from './auth.component';
import { LoginComponent } from './components/login/login.component';
import { RegistrationComponent } from './components/registration/registration.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { LogoutComponent } from './components/logout/logout.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { CambioPasswordObligatorioComponent } from './components/cambio-password-obligatorio/cambio-password-obligatorio.component';

const routes: Routes = [
  {
    path: '',
    component: AuthComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },

      {
        path: 'login',
        component: LoginComponent,
        data: { returnUrl: window.location.pathname },
      },

      {
        path: 'registration',
        component: RegistrationComponent,
      },

      {
        path: 'forgot-password',
        component: ForgotPasswordComponent,
      },

      {
        path: 'reset-password',
        component: ResetPasswordComponent,
      },

      // ✅ NUEVA RUTA: Cambio obligatorio de contraseña
      {
        path: 'cambio-password-obligatorio',
        component: CambioPasswordObligatorioComponent,
      },

      {
        path: 'logout',
        component: LogoutComponent,
      },

      // ⚠️ SIEMPRE AL FINAL
      { path: '**', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
