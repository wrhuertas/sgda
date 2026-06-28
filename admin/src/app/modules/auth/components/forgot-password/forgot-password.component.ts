import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { first } from 'rxjs/operators';
import Swal from 'sweetalert2';

enum ErrorStates {
  NotSubmitted,
  HasError,
  NoError,
}

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  errorState: ErrorStates = ErrorStates.NotSubmitted;
  errorStates = ErrorStates;
  isLoading$: Observable<boolean>;

  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/
  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.isLoading$ = this.authService.isLoading$;
  }

  ngOnInit(): void {
    this.initForm();
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.forgotPasswordForm.controls;
  }

  initForm() {
    this.forgotPasswordForm = this.fb.group({
      email: [
        'admin@demo.com',
        Validators.compose([
          Validators.required,
          Validators.email,
          Validators.minLength(3),
          Validators.maxLength(320), // https://stackoverflow.com/questions/386294/what-is-the-maximum-length-of-a-valid-email-address
        ]),
      ],
    });
  }

 submit(): void {
  // 1️⃣ Validar formulario
  if (this.forgotPasswordForm.invalid) {
    this.forgotPasswordForm.markAllAsTouched();
    return;
  }

  // 2️⃣ Mostrar Swal de carga
  Swal.fire({
    title: 'Espere',
    text: 'Estamos enviando el mensaje a su correo...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  // 3️⃣ Resetear estado
  this.errorState = ErrorStates.NotSubmitted;

  // 4️⃣ Llamar al servicio
  const sub = this.authService
    .forgotPassword(this.f.email.value)
    .pipe(first())
    .subscribe({
      // ✅ CUANDO TODO SALE BIEN
      next: (result: boolean) => {
        Swal.close();

        if (result === true) {
          Swal.fire(
            '¡Listo!',
            'Se ha enviado el enlace para restablecer la contraseña. Revisa tu correo.',
            'success'
          );
          this.errorState = ErrorStates.NoError;
        }
      },

      // 🔴 CUANDO EL BACKEND RESPONDE ERROR (403, 404, etc.)
      error: (err) => {
        Swal.close();

        console.log('❌ ERROR FORGOT PASSWORD:', err);

        // 👉 Mensaje real del backend (Laravel)
        const message =
          err?.error?.error ??
          'Ocurrió un problema al enviar el correo. Inténtalo nuevamente.';

        Swal.fire(
          'Error',
          message,
          'error'
        );

        this.errorState = ErrorStates.HasError;
      }
    });

  this.unsubscribe.push(sub);
}



}
