import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {

  isLoading$: Observable<boolean>;
  private isLoadingSubject: BehaviorSubject<boolean>;
  private idProyecto: number | null = null;

  setIdProyecto(id: number) {
    this.idProyecto = id;
  }

  getIdProyecto(): number | null {
    return this.idProyecto;
  }
  constructor(
    private http: HttpClient,
    private authservice: AuthService
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  // 🔸 Crear nuevo proyecto
  registerProyecto(data: any) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = URL_SERVICIOS + "/proyectos";
    return this.http.post(URL, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // 🔸 Listar proyectos (paginado + búsqueda)
  listProyectos(page = 1, search: string = '') {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = URL_SERVICIOS + "/proyectos/index?page=" + page;
    const body = { search };
    return this.http.post(URL, body, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // 🔸 Actualizar proyecto
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

  // 🔸 Eliminar proyecto
  deleteProyecto(idProyecto: string) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = URL_SERVICIOS + "/proyectos/" + idProyecto;
    return this.http.delete(URL, { headers }).pipe(
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





}
