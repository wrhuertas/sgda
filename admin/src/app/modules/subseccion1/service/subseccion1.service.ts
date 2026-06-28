import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from '../../auth';

@Injectable({
  providedIn: 'root'
})
export class Subseccion1Service {

  isLoading$: Observable<boolean>;
  private isLoadingSubject: BehaviorSubject<boolean>;

  constructor(private http: HttpClient, private authservice: AuthService) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  // Nuevo método para traer datos del proyecto por id
 getSubSeccionById(idSubseccion: number): Observable<any> {
  console.log('Enviando ID al backend:', idSubseccion);
  this.isLoadingSubject.next(true);

  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + this.authservice.token,
  });

  const url = `${URL_SERVICIOS}/subseccionDatos`;

  return this.http
    .post(url, { idSubseccion }, { headers })
    .pipe(finalize(() => this.isLoadingSubject.next(false)));
}


  // Obtener subsecciones de un proyecto
  listSubsecciones1(
    idSubSeccion: number,
    page: number = 1,
    search: string = ''
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + this.authservice.token,
    });

    const url = `${URL_SERVICIOS}/subsecciones1?idSubSeccion=${idSubSeccion}&page=${page}&search=${search}`;

    return this.http
      .get(url, { headers })
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  // Método para registrar Sub Sección
  registerSubseccion1(data: any): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + this.authservice.token,
    });

    const url = `${URL_SERVICIOS}/subseccionesingreso1`; // ruta en tu backend

    return this.http
      .post(url, data, { headers })
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
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


  update(id_subsubseccion1: string | number, data: any) {
    this.isLoadingSubject.next(true);
  
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
  
    // Añadir el ID al body
    const payload = { id_subsubseccion1, ...data };
  
    return this.http.post(`${URL_SERVICIOS}/subsubseccion1actualizar`, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }
  
  


   // 🔸 Eliminar subsección
   deleteSubseccion(idSubseccion: number) {
      this.isLoadingSubject.next(true);
    
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
    
      const URL = URL_SERVICIOS + '/subseccion1eliminar';
    
      // Enviar solo el ID en el body
      return this.http.post(URL, { id_subseccion: idSubseccion }, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }

  
}
