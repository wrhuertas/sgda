import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class CertificadoService {

  
      isLoading$: Observable<boolean>;
      isLoadingSubject: BehaviorSubject<boolean>;
    
      constructor(
        private http: HttpClient,
        public authservice: AuthService,
      ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
        this.isLoading$ = this.isLoadingSubject.asObservable();
      }
      // http://127.0.0.1:8000/api
      // Registrar y firmar acta de certificación
  registrarCertificacion(data:any) {
        this.isLoadingSubject.next(true);
        const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
        const URL = URL_SERVICIOS + "/certificacion/registrarcertificacion";
        return this.http.post(URL, data, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
      );
  }

    // Buscar trámite por número (reutiliza endpoint de préstamos)
    buscarTramitePorNumero(id_empresa: number, numero: string) {
      this.isLoadingSubject.next(true);
      const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
      const URL = URL_SERVICIOS + "/prestamo/buscar-tramite";
      return this.http.post(URL, { id_empresa, numero }, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }

    // Guardar borrador de certificación (igual que préstamo borrador)
    guardarBorradorCertificacion(data: any) {
      this.isLoadingSubject.next(true);
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token,
        'Content-Type': 'application/json'
      });
      const URL = URL_SERVICIOS + "/certificacion/registrarborradorcertificacion";
      return this.http.post(URL, data, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }
    
      listCertificados(page = 1, search: string = '', id_empresa: any) {
        this.isLoadingSubject.next(true);
        let headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
        
        // Añadimos id_empresa a la URL
        let URL = URL_SERVICIOS + `/listarcertificados?page=${page}&search=${search}&id_empresa=${id_empresa}`;
        
        return this.http.get(URL, {headers: headers}).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }
  
  
      numeroActa(id_empresa: number) {
        this.isLoadingSubject.next(true);
        const URL = URL_SERVICIOS + "/certificacion/numeroacta";
        return this.http.post(URL, { id_empresa }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }
  
  
         configProyectos(id_empresa: number) {
  
          const headers = new HttpHeaders({
            Authorization: 'Bearer ' + this.authservice.token
          });
        
         // Reutilizamos la misma configuración de proyectos/series/documentos
         const url = `${URL_SERVICIOS}/prestamo/documentos`;
        
          const params = {
            id_empresa: id_empresa.toString()
          };
        
          return this.http.get<any>(url, { headers, params });
        }
  
        buscarusuario(id_empresa: number, search: string) { // <--- Agregamos 'search'
          this.isLoadingSubject.next(true);
  
          // Reutilizamos el buscador de usuarios del módulo de préstamos
          const URL = URL_SERVICIOS + "/prestamo/buscarusuario";
  
          // Enviamos ambos datos al servidor
          return this.http.post(URL, { 
              id_empresa: id_empresa, 
              search: search 
          }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
          );
      }
  
      buscarDocumentos(data: { texto: string; id_empresa: number }, page: number = 1): Observable<any> {
        this.isLoadingSubject.next(true);
  
        const headers = new HttpHeaders({
          Authorization: 'Bearer ' + this.authservice.token,
          'Content-Type': 'application/json'
        });
  
        // Agregamos el parámetro page a la URL para que Laravel lo detecte
        const URL = `${URL_SERVICIOS}/buscarDocumentos?page=${page}`;
  
        const body = {
          busqueda: data.texto,
          id_empresa: data.id_empresa
        };
  
        return this.http.post<any>(URL, body, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }
  
  
      // Borrador o guardado intermedio si se requiere en el futuro
      guardarActaPrestamo(data: any) {
        this.isLoadingSubject.next(true);
        
        // Definimos los headers con el token de seguridad
        let headers = new HttpHeaders({
          'Authorization': 'Bearer ' + this.authservice.token,
          'Content-Type': 'application/json'
        });
  
        // Usamos el endpoint para registrar el préstamo (ajusta el nombre si en tu api es diferente)
        let URL = URL_SERVICIOS + "/certificacion/registrarcertificacion";
  
        return this.http.post(URL, data, { headers: headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }

      // Datos para armar/visualizar el PDF previo a firmar
      getDatosDocumento(id_certificacion: any, id_empresa: any, id_usuario: any): Observable<any> {
        this.isLoadingSubject.next(true);
        const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
        const URL = URL_SERVICIOS + '/certificacion/datosdocumentocertificacionPDF';
        const body = { id_certificacion, id_empresa, id_usuario };
        return this.http.post(URL, body, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }
}
