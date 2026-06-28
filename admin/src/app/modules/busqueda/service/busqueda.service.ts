import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from '../../auth';

@Injectable({
  providedIn: 'root'
})
export class BusquedaService {

  isLoading$: Observable<boolean>;
    isLoadingSubject: BehaviorSubject<boolean>;
  
    constructor(
      private http: HttpClient,
      public authservice: AuthService
    ) {
      this.isLoadingSubject = new BehaviorSubject<boolean>(false);
      this.isLoading$ = this.isLoadingSubject.asObservable();
    }

    // Añade el parámetro 'page' con un valor por defecto de 1
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
    
    
    obtenerDocumentoPorId(payload: any) {
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
    
      const url = `${URL_SERVICIOS}/documentos/obtener-documento`;
    
      // ⚠️ CRUCIAL: Agregar responseType 'blob'
      return this.http.post(url, payload, { 
        headers, 
        responseType: 'blob' 
      });
    }


    /*
      // Antes estaba algo como: obtenerDocumentoPorId(idDocumento: number)
      obtenerDocumentoPorId(payload: { idDocumento: number; idEmpresa: number;}) {
        const headers = new HttpHeaders({
          'Authorization': 'Bearer ' + this.authservice.token
        });

        const url = `${URL_SERVICIOS}/documentos/obtener-documento`;
        return this.http.post(url, payload, { headers });
      }*/


      configProyectos(id_empresa: number) {

        const headers = new HttpHeaders({
          Authorization: 'Bearer ' + this.authservice.token
        });
      
        const url = `${URL_SERVICIOS}/proyectos/config`;
      
        const params = {
          id_empresa: id_empresa.toString()
        };
      
        return this.http.get<any>(url, { headers, params });
      }
      
      





     buscarAvanzado(dataBusqueda: any): Observable<any> {
        this.isLoadingSubject.next(true);

        const headers = new HttpHeaders({
            'Authorization': 'Bearer ' + this.authservice.token,
            'Content-Type': 'application/json'
        });

        const URL = `${URL_SERVICIOS}/buscarDocumentosAvanzado`;

        return this.http.post<any>(URL, dataBusqueda, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }



    // busqueda.service.ts
    getDetalleDocumento(idDocumento: number, idEmpresa: number) {
      this.isLoadingSubject.next(true);
    
      const headers = new HttpHeaders({
          'Authorization': 'Bearer ' + this.authservice.token,
          'Content-Type': 'application/json'
      });
    
      const URL = `${URL_SERVICIOS}/documentos/detalle`;
    
      // 1. Creamos el objeto con los datos que espera Laravel
      const data = {
        id_documento: idDocumento,
        id_empresa: idEmpresa
      };
    
      // 2. Enviamos 'data' en el POST
      return this.http.post<any>(URL, data, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
      );
    }

    // Tipos de documento por empresa (uso provisional hasta contar con endpoint por serie/subserie)
    // En tu archivo service
// En tu servicio
getTiposDocumentoEmpresa(id_empresa: number): Observable<any> {
  this.isLoadingSubject.next(true);
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token,
    'Content-Type': 'application/json' // Asegúrate de incluir esto
  });
  
  const URL = `${URL_SERVICIOS}/tipodocumentosrie/${id_empresa}`;
  
  // Enviamos el ID dentro del objeto (el body)
  return this.http.post<any>(URL, { id_empresa: id_empresa }, { headers }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}

}
