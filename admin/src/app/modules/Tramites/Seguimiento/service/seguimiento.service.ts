import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class SeguimientoService {

  
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
            return new HttpHeaders({ 'Authorization': 'Bearer ' + token });
          }
  
  
          listTramites(
              id_empresa: number,
              id_usuario: number,
              page: number = 1,
              search: string = ''
            ) {
              this.isLoadingSubject.next(true);
  
              const headers = this.getHeaders();
  
              const URL =
                URL_SERVICIOS +
                '/listadohistorialtramites' +
                '?id_empresa=' + id_empresa +
                '&id_usuario=' + id_usuario +
                '&page=' + page +
                '&search=' + search;
  
              return this.http.get(URL, { headers }).pipe(
                finalize(() => this.isLoadingSubject.next(false))
              );
          }
  
  
  
         configArea(id_usuario: number) {
            this.isLoadingSubject.next(true);
    
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/area/configarea";
    
            return this.http.post(URL, { id_usuario: id_usuario }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }
  
  
           usuariosPorArea(id_area: number) {
            this.isLoadingSubject.next(true);
    
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/area/usuarioporarea";
    
            return this.http.post(URL, { id_area: id_area }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }
    
    
          docuemntosTramite(id_tramite: number) {
            this.isLoadingSubject.next(true);
    
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/area/documentostramite";
    
            return this.http.post(URL, { id_tramite: id_tramite }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }



      buscarTramite(numeroTramite: string, dni: string, id_empresa: number): Observable<any> {
        this.isLoadingSubject.next(true);

        const URL = `${URL_SERVICIOS}/tramite/seguimientoDatos`;

        const body = {
          numero_tramite: numeroTramite,
          dni: dni,
          id_empresa: id_empresa
        };

        return this.http.post(URL, body).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }
  
}
