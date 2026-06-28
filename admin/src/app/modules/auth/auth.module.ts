import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './components/login/login.component';
import { RegistrationComponent } from './components/registration/registration.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { LogoutComponent } from './components/logout/logout.component';
import { AuthComponent } from './auth.component';
import { TranslationModule } from '../i18n/translation.module';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ActualizarPasswordComponent } from './components/actualizar-password/actualizar-password.component';
import { CambioPasswordObligatorioComponent } from './components/cambio-password-obligatorio/cambio-password-obligatorio.component';

@NgModule({
  declarations: [
    LoginComponent,
    RegistrationComponent,
    ForgotPasswordComponent,
    LogoutComponent,
    AuthComponent,
    ResetPasswordComponent,
    ActualizarPasswordComponent,
    CambioPasswordObligatorioComponent,
  ],
  imports: [
    CommonModule,
    TranslationModule,
    AuthRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
  ],
  exports: [
    ActualizarPasswordComponent, // <--- exporta para otros módulos
    CambioPasswordObligatorioComponent,
  ]
})
export class AuthModule {}
