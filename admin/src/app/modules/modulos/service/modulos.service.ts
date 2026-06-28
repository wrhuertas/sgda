import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class ModulosService {

  isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;

  idProyecto: number = 0;


  constructor(
    private http: HttpClient,
    public authservice: AuthService
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  // ✅ Registrar módulo
  registerModulo(data: any) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = `${URL_SERVICIOS}/modulos`;
    return this.http.post(URL, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // ✅ Listar módulos
listModulos(page = 1, search: string = '', id_proyecto?: number) {
  this.isLoadingSubject.next(true);

  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  // Construir URL con parámetros
  let URL = `${URL_SERVICIOS}/modulos?page=${page}&search=${search}`;
  if (id_proyecto) {
    URL += `&id_proyecto=${id_proyecto}`;
  }

  return this.http.get(URL, { headers }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}





  // ✅ Actualizar módulo
  updateModulo(idModulo: string, data: any) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    // Enviar como POST con _method=PUT si usas FormData
    data.append('_method', 'PUT');

    const URL = `${URL_SERVICIOS}/modulos/${idModulo}`;
    return this.http.post(URL, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // ✅ Eliminar módulo
  deleteModulo(idModulo: string) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = `${URL_SERVICIOS}/modulos/${idModulo}`;
    return this.http.delete(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }


}
