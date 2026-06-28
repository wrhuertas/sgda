import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { first } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {

  resetForm!: FormGroup;
  token!: string;
  email!: string;
  isSubmitting = false;
  error = '';
  success = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {

  this.route.queryParams.subscribe(params => {

    console.log('PARAMS COMPLETOS:', params); // 👈 TODO
    this.token = params['token'];
    this.email = params['email'];

    console.log('TOKEN:', this.token); // 👈
    console.log('EMAIL:', this.email); // 👈
  });

  this.resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', Validators.required]
  }, {
    validators: this.passwordsMatch
  });
}


  // 3️⃣ Validar que coincidan las contraseñas
  passwordsMatch(form: FormGroup) {
    const pass = form.get('password')?.value;
    const confirm = form.get('password_confirmation')?.value;
    return pass === confirm ? null : { notMatch: true };
  }

  // 4️⃣ Enviar nueva contraseña
  submit() {
  if (this.resetForm.invalid) {
    this.resetForm.markAllAsTouched();
    return;
  }

  // 1️⃣ Mostrar Swal de espera
  Swal.fire({
    title: 'Espere',
    text: 'Actualizando su contraseña...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  this.isSubmitting = true;

  const data = {
    email: this.email,
    token: this.token,
    password: this.resetForm.value.password,
    password_confirmation: this.resetForm.value.password_confirmation
  };

  this.authService.resetPassword(data)
    .pipe(first())
    .subscribe({
      next: () => {
        Swal.close(); // cerrar spinner

        // 2️⃣ Mostrar Swal de éxito
        Swal.fire({
          icon: 'success',
          title: '¡Contraseña actualizada!',
          text: 'Se ha actualizado correctamente. Serás redirigido al login...',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        }).then(() => {
          this.router.navigate(['/auth/login']);
        });
      },
      error: () => {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'El enlace es inválido o expiró. Intenta nuevamente.'
        });
        this.isSubmitting = false;
      }
    });
}

}
