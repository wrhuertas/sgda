import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class PrestamoService {

  
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
    // Registra definitivamente el préstamo (acta) usando el endpoint correcto del backend
    registerPrestamo(data:any) {
      this.isLoadingSubject.next(true);
      const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
      const URL = URL_SERVICIOS + "/prestamo/registrarprestamo";
      return this.http.post(URL, data, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }
  
    listPrestamo(page = 1, search: string = '', id_empresa: any) {
      this.isLoadingSubject.next(true);
      let headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
      
      // Añadimos id_empresa a la URL
      let URL = URL_SERVICIOS + `/listarprestamos?page=${page}&search=${search}&id_empresa=${id_empresa}`;
      
      return this.http.get(URL, {headers: headers}).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }


    numeroActa(id_empresa: number) {
            this.isLoadingSubject.next(true);

            const URL = URL_SERVICIOS + "/prestamo/numeroacta";

            return this.http.post(URL, { id_empresa: id_empresa }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }


       configProyectos(id_empresa: number) {

        const headers = new HttpHeaders({
          Authorization: 'Bearer ' + this.authservice.token
        });
      
        const url = `${URL_SERVICIOS}/prestamo/documentos`;
      
        const params = {
          id_empresa: id_empresa.toString()
        };
      
        return this.http.get<any>(url, { headers, params });
      }

      buscarTramitePorNumero(id_empresa: number, numero: string) {
        this.isLoadingSubject.next(true);
        const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
        const URL = URL_SERVICIOS + "/prestamo/buscar-tramite";
        return this.http.post(URL, { id_empresa, numero }, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }

      

      buscarusuario(id_empresa: number, search: string) { // <--- Agregamos 'search'
        this.isLoadingSubject.next(true);

        const URL = URL_SERVICIOS + "/prestamo/buscarusuario";

        // Enviamos ambos datos al servidor
        return this.http.post(URL, { 
            id_empresa: id_empresa, 
            search: search 
        }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }


    // Actualiza un préstamo existente. Backend expone /actualizarprestamo/{id}
    updatePrestamo(id_prestamo: number, data: any) {
      this.isLoadingSubject.next(true);
      const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
      const URL = URL_SERVICIOS + `/actualizarprestamo/${id_prestamo}`;
      return this.http.post(URL, data, { headers }).pipe(
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


    guardarActaPrestamo(data: any) {
      this.isLoadingSubject.next(true);
      
      // Definimos los headers con el token de seguridad
      let headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token,
        'Content-Type': 'application/json'
      });

      // Usamos el endpoint para registrar el préstamo (ajusta el nombre si en tu api es diferente)
      let URL = URL_SERVICIOS + "/prestamo/registrarprestamo";

      return this.http.post(URL, data, { headers: headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }

     guardarBorradorActaPrestamo(data: any) {
      this.isLoadingSubject.next(true);
      
      // Definimos los headers con el token de seguridad
      let headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token,
        'Content-Type': 'application/json'
      });

      // Usamos el endpoint para registrar el préstamo (ajusta el nombre si en tu api es diferente)
      let URL = URL_SERVICIOS + "/prestamo/registrarborradorprestamo";

      return this.http.post(URL, data, { headers: headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }


   getDatosDocumento(id_prestamo: any, id_empresa: any, id_usuario: any): Observable<any> {
        this.isLoadingSubject.next(true);
        const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
        const URL = URL_SERVICIOS + '/prestamo/datosdocumentoprestamoPDF';

        // 🟢 Añadido id_usuario al objeto que viaja por POST
        const body = { 
            id_prestamo: id_prestamo, 
            id_empresa: id_empresa,
            id_usuario: id_usuario
        };

        return this.http.post(URL, body, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

      
}
