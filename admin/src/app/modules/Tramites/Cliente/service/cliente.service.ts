import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {

  
      isLoading$: Observable<boolean>;
      isLoadingSubject: BehaviorSubject<boolean>;
    
      constructor(
        private http: HttpClient,
        public authservice: AuthService
      ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
        this.isLoading$ = this.isLoadingSubject.asObservable();
      }
    
      registerCliente(data: any) {
        this.isLoadingSubject.next(true);
        const headers = new HttpHeaders({
          'Authorization': 'Bearer ' + this.authservice.token
        });
        const URL = URL_SERVICIOS + "/cliente";
        return this.http.post(URL, data, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }
    
      listClientes(
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
          "/clientes" +
          "?id_empresa=" + id_empresa +
          "&page=" + page +
          "&search=" + search;

        return this.http.get(URL, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }
    
       updateCliente(idCliente: string, data: FormData): Observable<any> {
          this.isLoadingSubject.next(true);

          const headers = new HttpHeaders({
            'Authorization': 'Bearer ' + this.authservice.token
          });

          const URL = `${URL_SERVICIOS}/cliente/${idCliente}`;

          return this.http.post(URL, data, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }


    
    
     deleteCliente(idCliente: string) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const URL = URL_SERVICIOS + "/cliente/" + idCliente;

  return this.http.delete(URL, { headers });
}

    
      getClienteById(idCliente: number) {
      this.isLoadingSubject.next(true);
    
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
    
      const URL = `${URL_SERVICIOS}/cliente/${idCliente}`;
    
      return this.http.get(URL, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }

    consultarSri(ruc: string) {
      this.isLoadingSubject.next(true);
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token,
        'Content-Type': 'application/json',
      });

      const URL = `${URL_SERVICIOS}/cliente/consultar-sri`;
      return this.http.post(URL, { ruc }, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }
}
