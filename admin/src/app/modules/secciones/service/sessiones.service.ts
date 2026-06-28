import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class SeccionesService {

  isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;

  constructor(
    private http: HttpClient,
    public authservice: AuthService
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  // Obtener todas las secciones de un módulo (sin paginación ni búsqueda)
  listSeccionesByModulo(idModulo: number): Observable<any> {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = `${URL_SERVICIOS}/modulos/${idModulo}/secciones`;
    return this.http.get(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  registrarDocumento(data: any): Observable<any> {
  this.isLoadingSubject.next(true);

  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const URL = `${URL_SERVICIOS}/documentos`;

  return this.http.post(URL, data, { headers }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}

listDocumentos(page = 1, filtros: any = {}) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const url = `${URL_SERVICIOS}/documentos/index?page=${page}`;
  return this.http.post(url, filtros, { headers });
}

 permisosUsuario(ID_USER: string) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = URL_SERVICIOS + "/users/permisos-documentales/" + ID_USER;
    return this.http.post(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }




}
