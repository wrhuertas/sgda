import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { UserModel } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  // KeenThemes mock, change it to:
  defaultAuth: any = {
    email: '',
     password: '',
  };
  loginForm: FormGroup;
  hasError: boolean;
  returnUrl: string;
  isLoading$: Observable<boolean>;

  errorMessage: string = '';

  // CAPTCHA visual simulado (tipo v2)
  fauxCaptchaVerified: boolean = false;
  fauxCaptchaLoading: boolean = false;

  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.isLoading$ = this.authService.isLoading$;
    // redirect to home if already logged in
    if (this.authService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    this.initForm();
    // get return url from route parameters or default to '/'
    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'.toString()] || '/';
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.loginForm.controls;
  }

  initForm() {
    this.loginForm = this.fb.group({
      email: [
        this.defaultAuth.email,
        Validators.compose([
          Validators.required,
          Validators.email,
          Validators.minLength(3),
          Validators.maxLength(320), // https://stackoverflow.com/questions/386294/what-is-the-maximum-length-of-a-valid-email-address
        ]),
      ],
      password: [
        this.defaultAuth.password,
        Validators.compose([
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
        ]),
      ]
    });
  }

  marcarNoSoyRobot() {
    if (this.fauxCaptchaLoading || this.fauxCaptchaVerified) return;
    this.fauxCaptchaLoading = true;
    // Animación de verificación fija 2s, ejecutada dentro de NgZone
    setTimeout(() => {
      this.ngZone.run(() => {
        this.fauxCaptchaVerified = true;
        this.fauxCaptchaLoading = false;
        // Fuerza refresco inmediato de la vista
        this.cdr.detectChanges();
      });
    }, 2000);
  }

  

 submit() {
  console.log('🟡 submit() ejecutado');

  this.hasError = false;
  this.errorMessage = '';

  console.log('📧 Email:', this.f.email.value);
  console.log('🔑 Password:', this.f.password.value);

  const loginSubscr = this.authService
    .login(this.f.email.value, this.f.password.value)
    .pipe(first())
    .subscribe({
      next: (user: any) => {
        if (user) {
          document.location.reload();
        }
      },
      error: (err) => {
        this.hasError = true;
        if (err?.error?.error) {
          this.errorMessage = err.error.error;
        } else {
          this.errorMessage = 'Credenciales incorrectas';
        }
      }
    });

  this.unsubscribe.push(loginSubscr);
}



  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
