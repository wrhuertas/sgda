import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class TipotramitesService {

  isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;

  constructor(
    private http: HttpClient,
    public authservice: AuthService
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  private getHeaders(): HttpHeaders {
    const token = this.authservice.token || localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': 'Bearer ' + token
    });
  }



  listTipoTramites(id_empresa: number,
    page: number = 1,
    search: string = ''): Observable<any> {
    this.isLoadingSubject.next(true);

    
    const headers = this.getHeaders();
    const URL =
      URL_SERVICIOS +
      "/listartipotramites" +
      "?id_empresa=" + id_empresa +
      "&page=" + page +
      "&search=" + search;
    return this.http.get(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  registerTipotramite(data: any): Observable<any> {
    this.isLoadingSubject.next(true);
    const headers = this.getHeaders();
    const URL = URL_SERVICIOS + "/registrartipotramite";
    return this.http.post(URL, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  updateTipotramite(id: number, data: any): Observable<any> {
    this.isLoadingSubject.next(true);
    const headers = this.getHeaders();
    const URL = URL_SERVICIOS + "/actualizartipotramite/" + id;
    return this.http.put(URL, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  deleteTipotramite(id: number): Observable<any> {
    this.isLoadingSubject.next(true);
    const headers = this.getHeaders();
    const URL = URL_SERVICIOS + "/eliminatipotramite/" + id;
    return this.http.get(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  getTiposTramite(id_empresa: any): Observable<any> {
    this.isLoadingSubject.next(true);

    // 1. Preparamos los Headers
    const headers = this.getHeaders();

    // 2. Definimos la URL (usando la Opción A: ID en la URL)
    const URL = URL_SERVICIOS + "/tipotramiteempresa/" + id_empresa;

    // 3. Enviamos la petición con los headers
    return this.http.post(URL, {}, { headers: headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
    );
}
}
