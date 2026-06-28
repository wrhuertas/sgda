import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {

  isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;

  constructor(
    private http: HttpClient,
    public authservice: AuthService
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  registerEmpresa(data: any) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = URL_SERVICIOS + "/empresas";
    return this.http.post(URL, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  listEmpresas(page = 1, search: string = '') {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = URL_SERVICIOS + "/empresas?page=" + page + "&search=" + search;
    return this.http.get(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  updateEmpresa(idEmpresa: string, data: any) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = URL_SERVICIOS + "/empresas/" + idEmpresa;

    // Agregar el método override para que Laravel interprete como PUT
    data.append('_method', 'PUT');

    // Cambiar a POST para que Laravel procese bien el multipart/form-data
    return this.http.post(URL, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }


  deleteEmpresa(idEmpresa: string) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = URL_SERVICIOS + "/empresas/" + idEmpresa;
    return this.http.delete(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  getEmpresaById(idEmpresa: number) {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/empresas/${idEmpresa}`;

    return this.http.get(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }



   cargarempresaid(idEmpresa: number) {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/empresaid/${idEmpresa}`;

    return this.http.get(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }



 actualizarEmpresa(idEmpresa: number, data: FormData) {
  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + this.authservice.token
  });

  const URL = `${URL_SERVICIOS}/empresa/update/${idEmpresa}`;
  return this.http.post(URL, data, { headers }); // ✅ POST en lugar de PUT
}






  enviarMensajeWhatsApp(payload: { number: string, message: string }) {
    return this.http.post('http://localhost:3000/send-message', payload);
  }



 // 🔹 SUBIR / ACTUALIZAR LOGO DE EMPRESA
 getEmpresaLogo(idEmpresa: number | string) {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + this.authservice.token
    });

     const URL = `${URL_SERVICIOS}/empresaid/${idEmpresa}`;

     return this.http.get(URL, { headers }).pipe(
       finalize(() => this.isLoadingSubject.next(false))
     );
   }

   // 🔍 Obtener el primer ADMIN de una empresa
   obtenerAdminEmpresa(idEmpresa: number): Observable<any> {
     this.isLoadingSubject.next(true);
     const headers = new HttpHeaders({
       'Authorization': 'Bearer ' + this.authservice.token
     });
     const URL = `${URL_SERVICIOS}/empresas/${idEmpresa}/admin`;
     return this.http.get(URL, { headers }).pipe(
       finalize(() => this.isLoadingSubject.next(false))
     );
   }

}
