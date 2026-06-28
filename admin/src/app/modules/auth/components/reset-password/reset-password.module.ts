import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  isSubmitting = false;
  error: string | null = null;
  success = false;

  token!: string;
  email!: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // 1️⃣ Obtener token y email de la URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      this.email = params['email'];
      console.log('TOKEN:', this.token);
      console.log('EMAIL:', this.email);
    });

    // 2️⃣ Crear formulario
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required]
    }, {
      validator: this.passwordsMatch
    });
  }

  // ✅ Validación personalizada para confirmar contraseña
  passwordsMatch(control: AbstractControl) {
    const pass = control.get('password')?.value;
    const confirm = control.get('password_confirmation')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  submit() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      this.error = 'Por favor completa todos los campos correctamente.';
      return;
    }

    this.isSubmitting = true;
    this.error = null;

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
          this.success = true;
          setTimeout(() => this.router.navigate(['/auth/login']), 2000);
        },
        error: (err) => {
          console.error(err);
          this.error = 'El enlace es inválido o expiró.';
          this.isSubmitting = false;
        }
      });
  }
}
