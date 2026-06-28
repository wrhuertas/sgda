import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class AreaService {

   isLoading$: Observable<boolean>;
    isLoadingSubject: BehaviorSubject<boolean>;
  
    constructor(
      private http: HttpClient,
      public authservice: AuthService
    ) {
      this.isLoadingSubject = new BehaviorSubject<boolean>(false);
      this.isLoading$ = this.isLoadingSubject.asObservable();
    }
  
    registerArea(data: any) {
      this.isLoadingSubject.next(true);
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
      const URL = URL_SERVICIOS + "/area";
      return this.http.post(URL, data, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }
  
    listAreas(id_empresa: number,
        page: number = 1,
        search: string = '') {
      this.isLoadingSubject.next(true);
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
       const URL =
          URL_SERVICIOS +
          "/areas" +
          "?id_empresa=" + id_empresa +
          "&page=" + page +
          "&search=" + search;
      return this.http.get(URL, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }
  
    updateArea(idArea: string, data: any) {
      this.isLoadingSubject.next(true);

      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
        // No pongas Content-Type, Angular lo pone automáticamente para multipart/form-data
      });

      const URL = URL_SERVICIOS + "/area/" + idArea;

      // Crear FormData
      const formData = new FormData();
      formData.append('_method', 'PUT'); // Laravel interpreta como PUT
      formData.append('nombre', data.nombre);
      formData.append('ver_todos_tramites', data.ver_todos_tramites.toString());
      formData.append('estado', data.estado.toString()); // <-- Agregado aquí

      return this.http.post(URL, formData, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }


  
  
    deleteArea(idArea: string) {
      this.isLoadingSubject.next(true);

      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });

      const URL = URL_SERVICIOS + "/area/" + idArea;

      return this.http.delete(URL, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }



  
    getAreaById(idEmpresa: number) {
    this.isLoadingSubject.next(true);
  
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
  
    const URL = `${URL_SERVICIOS}/area/${idEmpresa}`;
  
    return this.http.get(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }
  

  
}
