import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { AuthService } from '../../auth';
import { URL_SERVICIOS } from 'src/app/config/config';

@Injectable({
  providedIn: 'root',
})
export class SubseccionService {
  isLoading$: Observable<boolean>;
  private isLoadingSubject: BehaviorSubject<boolean>;

  constructor(private http: HttpClient, private authservice: AuthService) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  // Nuevo método para traer datos del proyecto por id
  getProyectoById(idProyecto: number): Observable<any> {
    console.log('Enviando ID al backend:', idProyecto);
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + this.authservice.token,
    });

    const url = `${URL_SERVICIOS}/proyectosDatos`;

    // Enviamos como objeto con propiedad idProyecto
    return this.http
      .post(url, { idProyecto: idProyecto }, { headers })
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  // Obtener subsecciones de un proyecto
  listSubsecciones(
    idProyecto: number,
    page: number = 1,
    search: string = ''
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + this.authservice.token,
    });

    const url = `${URL_SERVICIOS}/subsecciones?idProyecto=${idProyecto}&page=${page}&search=${search}`;

    return this.http
      .get(url, { headers })
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  // Método para registrar Sub Sección
  registerSubseccion(data: any): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + this.authservice.token,
    });

    const url = `${URL_SERVICIOS}/subseccionesingreso`; // ruta en tu backend

    return this.http
      .post(url, data, { headers })
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }



  updateProyecto(idProyecto: string, data: any) {
  this.isLoadingSubject.next(true);
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });
  const URL = URL_SERVICIOS + "/proyectos/" + idProyecto;

  // Este append aquí puede causar duplicados si ya lo hiciste en el componente
  // data.append('_method', 'PUT'); 

  return this.http.post(URL, data, { headers }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
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


  // 🔸 Eliminar subsección
  deleteSubseccion(idSubseccion: number) {
    this.isLoadingSubject.next(true);
  
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
  
    const URL = URL_SERVICIOS + '/subseccioneliminar';
  
    // Enviar solo el ID en el body
    return this.http.post(URL, { id_subseccion: idSubseccion }, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }
  

}
