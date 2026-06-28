import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from '../../auth';

@Injectable({
  providedIn: 'root'
})
export class Subseccion2Service {

    isLoading$: Observable<boolean>;
    private isLoadingSubject: BehaviorSubject<boolean>;
  
    constructor(private http: HttpClient, private authservice: AuthService) {
      this.isLoadingSubject = new BehaviorSubject<boolean>(false);
      this.isLoading$ = this.isLoadingSubject.asObservable();
    }
  
    // Nuevo método para traer datos del proyecto por id
   getSubSeccio1nById(idSubseccion: number): Observable<any> {
    console.log('Enviando ID al backend:', idSubseccion);
    this.isLoadingSubject.next(true);
  
    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + this.authservice.token,
    });
  
    const url = `${URL_SERVICIOS}/subseccion1Datos`;
  
    return this.http
      .post(url, { idSubseccion }, { headers })
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }
  
  
    // Obtener subsecciones de un proyecto
    listSubsecciones2(
      idSubSeccion: number,
      page: number = 1,
      search: string = ''
    ): Observable<any> {
      this.isLoadingSubject.next(true);
  
      const headers = new HttpHeaders({
        Authorization: 'Bearer ' + this.authservice.token,
      });
  
      const url = `${URL_SERVICIOS}/subsecciones2?idSubSeccion=${idSubSeccion}&page=${page}&search=${search}`;
  
      return this.http
        .get(url, { headers })
        .pipe(finalize(() => this.isLoadingSubject.next(false)));
    }
  
    // Método para registrar Sub Sección
    registerSubseccion2(data: any): Observable<any> {
      this.isLoadingSubject.next(true);
  
      const headers = new HttpHeaders({
        Authorization: 'Bearer ' + this.authservice.token,
      });
  
      const url = `${URL_SERVICIOS}/subseccionesingreso2`; // ruta en tu backend
  
      return this.http
        .post(url, data, { headers })
        .pipe(finalize(() => this.isLoadingSubject.next(false)));
    }
}
