import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';


@Injectable({
  providedIn: 'root'
})
export class TipodocumentoService {

  isLoading$: Observable<boolean>;
      isLoadingSubject: BehaviorSubject<boolean>;
    
      constructor(
        private http: HttpClient,
        public authservice: AuthService
      ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
        this.isLoading$ = this.isLoadingSubject.asObservable();
      }
    
      registerTipoDocumento(data: any) {
        this.isLoadingSubject.next(true);
        const headers = new HttpHeaders({
          'Authorization': 'Bearer ' + this.authservice.token
        });
        const URL = URL_SERVICIOS + "/tipodocumento";
        return this.http.post(URL, data, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }
    
      listTipoDocumento(
        id_empresa: number,
        page: number = 1,
        search: string = ''
      ) {
        this.isLoadingSubject.next(true);

        const headers = new HttpHeaders({
          'Authorization': 'Bearer ' + this.authservice.token
        });

        const URL =
          URL_SERVICIOS +
          "/tipodocumentos" +
          "?id_empresa=" + id_empresa +
          "&page=" + page +
          "&search=" + search;

        return this.http.get(URL, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }



    
      updateTipoDocumento(idTipoDocumento: string, data: any) {
        this.isLoadingSubject.next(true);
        const headers = new HttpHeaders({
            'Authorization': 'Bearer ' + this.authservice.token,
            'Content-Type': 'application/json' // Indicamos que es JSON
        });
        
        const URL = URL_SERVICIOS + "/tipodocumentoeditar/" + idTipoDocumento;
    
        // Usamos .put directamente ya que tu ruta en Laravel es Route::put
        return this.http.put(URL, data, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }
    
    
      deleteTipoDocumento(idTipoDocumento: string) {
        this.isLoadingSubject.next(true);
        const headers = new HttpHeaders({
          'Authorization': 'Bearer ' + this.authservice.token
        });
        const URL = URL_SERVICIOS + "/tipodocumentoeliminar/" + idTipoDocumento;
        return this.http.delete(URL, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }
    
      getTipoDocumentoById(idTipoDocumento: number) {
      this.isLoadingSubject.next(true);
    
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
    
      const URL = `${URL_SERVICIOS}/tipodocumento/${idTipoDocumento}`;
    
      return this.http.get(URL, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }
    
}
