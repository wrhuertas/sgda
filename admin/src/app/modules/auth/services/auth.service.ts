import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, of, Subscription, throwError } from 'rxjs';
import { map, catchError, switchMap, finalize } from 'rxjs/operators';
import { UserModel } from '../models/user.model';
import { AuthModel } from '../models/auth.model';
import { AuthHTTPService } from './auth-http';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { URL_BACKEND, URL_SERVICIOS } from 'src/app/config/config';

export type UserType = UserModel | undefined;

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/
  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  // public fields
  currentUser$: Observable<UserType>;
  isLoading$: Observable<boolean>;
  currentUserSubject: BehaviorSubject<UserType>;
  isLoadingSubject: BehaviorSubject<boolean>;

  private _id_empresaSubject = new BehaviorSubject<number | null>(null);
  id_empresa$ = this._id_empresaSubject.asObservable();

  set id_empresa(value: number | null) {
    this._id_empresaSubject.next(value);
  }

  get id_empresa(): number | null {
    return this._id_empresaSubject.value;
  }


private _id_usuarioSubject = new BehaviorSubject<string | null>(null);
id_usuario$ = this._id_usuarioSubject.asObservable();

set id_usuario(value: string | null) {
  this._id_usuarioSubject.next(value);
}

get id_usuario(): string | null {
  return this._id_usuarioSubject.value;
}

  get currentUserValue(): UserType {
    return this.currentUserSubject.value;
  }

  set currentUserValue(user: UserType) {
    this.currentUserSubject.next(user);
  }

  token:any;
  user:any;
  constructor(
    private authHttpService: AuthHTTPService,
    private router: Router,
    private http: HttpClient,
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.currentUserSubject = new BehaviorSubject<UserType>(undefined);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
    const subscr = this.getUserByToken().subscribe();
    this.unsubscribe.push(subscr);
  }

  // public methods
  login(email: string, password: string, recaptchaToken?: string): Observable<any> {
  this.isLoadingSubject.next(true);

  const payload: any = { email, password };
  if (recaptchaToken) payload.recaptcha_token = recaptchaToken;

  return this.http.post(URL_SERVICIOS + "/auth/login", payload).pipe(
    map((auth: any) => {
      const result = this.setAuthFromLocalStorage(auth);
      return result;
    }),

    // 🔴 AQUÍ ESTÁ LA CLAVE
    catchError((err) => {
      console.error('❌ ERROR EN LOGIN SERVICE:', err);

      // 👉 reenviamos el error al componente
      return throwError(() => err);
    }),

    finalize(() => this.isLoadingSubject.next(false))
  );
}

  /**
   * Ingreso validando contra el directorio externo de la empresa.
   * La contraseña no se compara con la del sistema: la valida el servidor de
   * Active Directory (o la API) que tenga configurada esa empresa.
   */
  loginDirectorio(email: string, password: string, id_empresa: number): Observable<any> {
    this.isLoadingSubject.next(true);

    return this.http.post(URL_SERVICIOS + '/auth/login-directorio', { email, password, id_empresa }).pipe(
      map((auth: any) => this.setAuthFromLocalStorage(auth)),
      catchError((err) => throwError(() => err)),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

logout() {
  if (this.token) {
    this.http.post('/api/logout', {}, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: () => {
        this.clearStorage();
      },
      error: () => {
        // aunque falle, igual limpiamos
        this.clearStorage();
      }
    });
  } else {
    this.clearStorage();
  }
}

private clearStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  this.user = null;
  this.token = null;
  this.router.navigate(['/auth/login']);
}



  getUserByToken(): Observable<any> {
    const auth = this.getAuthFromLocalStorage();
    if (!auth) {
      return of(undefined);
    }

    this.isLoadingSubject.next(true);

    // La sesión guarda los datos tal como estaban al iniciarla, así que si el
    // usuario cambió su foto después, la de la cabecera queda vieja. Se
    // refresca aparte para no demorar el arranque.
    this.refrescarFoto();

    return of(auth).pipe(
      map((user: any) => {
        if (user) {
          this.currentUserSubject.next(user);
        } else {
          this.logout();
        }
        return user;
      }),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  /**
   * Trae la foto actual desde /me y la actualiza en la sesión.
   * Sólo toca el avatar: el resto de los datos se dejan como estaban para no
   * pisar permisos ni rol, que /me no devuelve con el mismo formato.
   */
  private refrescarFoto(): void {
    const token = localStorage.getItem('token');
    const guardado = localStorage.getItem('user');

    if (!token || !guardado) { return; }

    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });

    this.http.post(URL_SERVICIOS + '/me', {}, { headers }).subscribe({
      next: (perfil: any) => {
        try {
          const usuario = JSON.parse(guardado);

          const avatar = perfil?.avatar
            ? URL_BACKEND + 'storage/' + perfil.avatar
            : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

          if (usuario.avatar === avatar) { return; }

          usuario.avatar = avatar;

          localStorage.setItem('user', JSON.stringify(usuario));
          this.user = usuario;
          this.currentUserSubject.next(usuario);
        } catch (e) {
          console.error('No se pudo refrescar la foto del usuario', e);
        }
      },
      // Si falla se sigue usando la foto guardada, no es motivo para cortar
      error: () => {}
    });
  }

  // need create new user then login
  registration(user: UserModel): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.authHttpService.createUser(user).pipe(
      map(() => {
        this.isLoadingSubject.next(false);
      }),
      switchMap(() => this.login(user.email, user.password)),
      catchError((err) => {
        console.error('err', err);
        return of(undefined);
      }),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

forgotPassword(email: string): Observable<boolean> {
  this.isLoadingSubject.next(true);

  return this.http
    .post<boolean>(URL_SERVICIOS + "/auth/forgot-password", { email })
    .pipe(
      map((resp: boolean) => resp === true),

      catchError((err) => {
        console.error('❌ FORGOT PASSWORD ERROR:', err);

        // 🔥 DEJAR PASAR EL ERROR
        return throwError(() => err);
      }),

      finalize(() => this.isLoadingSubject.next(false))
    );
}



  // private methods
  private setAuthFromLocalStorage(auth: any): boolean {
  if (auth && auth.access_token) {
    // 🚀 LIMPIEZA DE PERMISOS ANTES DE GUARDAR
    if (auth.user && auth.user.permissions) {
      auth.user.permissions = auth.user.permissions.map((p: string) => 
        p.replace(/[\n\r]/g, '').trim()
      );
    }

    localStorage.setItem('token', auth.access_token);
    localStorage.setItem('user', JSON.stringify(auth.user));
    
    // Actualizamos las variables locales
    this.token = auth.access_token;
    this.user = auth.user;
    
    return true;
  }
  return false;
}

  private getAuthFromLocalStorage(): AuthModel | undefined {
    try {
      const lsValue = localStorage.getItem('user');
      if (!lsValue) {
        return undefined;
      }
      this.token = localStorage.getItem('token');
      this.user  = JSON.parse(lsValue);

      const authData = this.user;
      return authData;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }


  resetPassword(data: any) {
    return this.http.post(
      URL_SERVICIOS + '/auth/reset-password',
      data
    );
  }

  
}
