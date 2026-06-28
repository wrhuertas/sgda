import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from '../../auth';

@Injectable({
  providedIn: 'root'
})
export class RespaldoService {

  

  isLoading$: Observable<boolean>;
    private isLoadingSubject: BehaviorSubject<boolean>;

  constructor(
      private http: HttpClient,
      private authservice: AuthService
    ) {
      this.isLoadingSubject = new BehaviorSubject<boolean>(false);
      this.isLoading$ = this.isLoadingSubject.asObservable();
    }


    SeccionSelect(id_usuario: number) {
      this.isLoadingSubject.next(true);
    
      // 1. Creamos los headers con el Token
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
    
      const URL = URL_SERVICIOS + "/seccion/selectseccion";
    
      // 2. IMPORTANTE: Debes pasar los headers como segundo o tercer argumento
      // En un POST, el segundo es el BODY y el tercero son las OPTIONS (donde van los headers)
      return this.http.post(URL, { id_usuario: id_usuario }, { headers: headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }



    getReporte(tipoReporte: string, data: any = {}) {
  this.isLoadingSubject.next(true);

  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  // La URL se arma según la opción seleccionada
  const URL = `${URL_SERVICIOS}/reporte/${tipoReporte}`;

  return this.http.post(URL, data, { headers }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}


exportarRespaldo(data: any) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  return this.http.post(URL_SERVICIOS + "/respaldo/archivo", data, {
    headers,
    responseType: 'blob'   // 👈 IMPORTANTE
  });
}


// Preview de tamaño del ZIP de archivos antes de descargar
getRespaldoArchivosPreview(data: any) {
  const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
  const url = `${URL_SERVICIOS}/respaldo/archivo/preview`;
  return this.http.post(url, data, { headers });
}

 // ✅ Función para enviar solo el ID del usuario
setUsuarioId(userId: string) {
  this.isLoadingSubject.next(true);

  const URL = `${URL_SERVICIOS}/auditoria/idusuario`;

  // 👇 Aquí enviamos el body directamente y los headers aparte
  return this.http.post(URL, { user_id: userId }, {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token,
      'Content-Type': 'application/json'
    })
  }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}


getAuditoriaUsuario(userId: string) {
  const URL = `${URL_SERVICIOS}/auditoria/usuario`; // Endpoint que crearemos en Laravel
  return this.http.post(URL, { user_id: userId }, {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token,
      'Content-Type': 'application/json'
    })
  });
}


getRespaldoBD(): Observable<any> {
  this.isLoadingSubject.next(true);
  let headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
  
  // Cambia '/respaldo/database' por la ruta real de tu API en Laravel
  return this.http.get(`${URL_SERVICIOS}/respaldo/database`, { 
    headers: headers, 
    responseType: 'blob' // CRÍTICO: Para que Angular entienda que viene un archivo
  }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}

// Preview de tamaño antes de descargar
getRespaldoBDPreview(mode: 'full'|'schema' = 'full') {
  const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
  const url = `${URL_SERVICIOS}/respaldo/database/preview?mode=${mode}`;
  return this.http.get(url, { headers });
}

// Descargar con modo
descargarRespaldoBD(mode: 'full'|'schema' = 'full') {
  this.isLoadingSubject.next(true);
  const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
  const url = `${URL_SERVICIOS}/respaldo/database?mode=${mode}`;
  return this.http.get(url, { headers, responseType: 'blob' }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}


}
