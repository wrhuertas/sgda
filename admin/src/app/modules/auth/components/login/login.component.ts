import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { UserModel } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { URL_SERVICIOS } from 'src/app/config/config';

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

  // Ingreso por Active Directory: al marcarlo se elige contra qué empresa validar
  usaDirectorioActivo: boolean = false;
  empresaSeleccionada: number | null = null;
  empresas: any[] = [];
  cargandoEmpresas: boolean = false;
  verificandoEmpresa: boolean = false;

  /** null mientras no se haya verificado ninguna empresa */
  directorioConfigurado: boolean | null = null;

  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private toast: ToastrService
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

    this.cargarEmpresas();
  }

  /**
   * Trae las empresas para el select de Active Directory.
   * Es un endpoint público que sólo devuelve id y nombre, porque acá todavía
   * no hay sesión iniciada.
   */
  cargarEmpresas(): void {
    this.cargandoEmpresas = true;

    this.http.get(URL_SERVICIOS + '/empresas-login').subscribe({
      next: (respuesta: any) => {
        this.empresas = respuesta?.empresas || [];
        this.cargandoEmpresas = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando empresas', err);
        this.empresas = [];
        this.cargandoEmpresas = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Con Active Directory marcado hay que haber elegido una empresa y que su
   * conexión esté bien configurada; si no, el botón de ingresar queda apagado.
   */
  puedeIngresar(): boolean {
    if (!this.usaDirectorioActivo) { return true; }

    return !!this.empresaSeleccionada
      && this.directorioConfigurado === true
      && !this.verificandoEmpresa;
  }

  /** Al destildar el check se limpia lo elegido para no dejar avisos viejos */
  alCambiarDirectorio(): void {
    if (!this.usaDirectorioActivo) {
      this.empresaSeleccionada = null;
      this.directorioConfigurado = null;
      this.verificandoEmpresa = false;
    }
  }

  /**
   * Al elegir una empresa se revisa contra el servidor si tiene cargados los
   * datos de Active Directory (o de la API externa).
   *
   * Ni el toast ni la consola dicen qué campo falta ni qué método usa la
   * empresa: es una pantalla pública y esos datos no tienen por qué salir.
   */
  verificarEmpresa(): void {
    this.directorioConfigurado = null;

    if (!this.empresaSeleccionada) { return; }

    this.verificandoEmpresa = true;

    this.http
      .get(URL_SERVICIOS + '/empresas-login/' + this.empresaSeleccionada + '/verificar')
      .subscribe({
        next: () => {
          this.directorioConfigurado = true;
          this.verificandoEmpresa = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.directorioConfigurado = false;
          this.verificandoEmpresa = false;

          const detalle = err?.error?.mensaje
            || 'Falta completar la configuración de conexión de la empresa.';
          console.error('Active Directory:', detalle);

          // Aviso para el usuario, sin detalles de la configuración
          this.toast.error(
            err?.error?.mensaje_usuario || 'Error de conexión, consulte con el Administrador'
          );

          this.cdr.detectChanges();
        }
      });
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

  // Con el check marcado no se puede entrar si la empresa no está lista
  if (this.usaDirectorioActivo && !this.puedeIngresar()) {
    this.toast.error('Error de conexión, consulte con el Administrador');
    return;
  }

  // Con Active Directory marcado el ingreso lo valida el servidor de la
  // empresa, así que no se usa el login normal contra la base local
  const ingreso = this.usaDirectorioActivo
    ? this.authService.loginDirectorio(
        this.f.email.value,
        this.f.password.value,
        this.empresaSeleccionada as number
      )
    : this.authService.login(this.f.email.value, this.f.password.value);

  const loginSubscr = ingreso
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
