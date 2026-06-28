import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from '../../auth';


export interface ProgresoResponse {
  estado: string;
  total_paginas: number;
  paginas_procesadas: number;
  zip_path: string | null;
  error: string | null;
  zipUrl?: string;
}


@Injectable({
  providedIn: 'root'
})
export class MasivoService {

  isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;
  
  constructor(
    private http: HttpClient,
    public authservice: AuthService,
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  desunirPdf(file: File): Observable<Blob> {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
      // No pongas Content-Type aquí cuando envías FormData, el navegador lo asigna automáticamente
    });

    const formData = new FormData();
    formData.append('archivo_pdf', file);

    const URL = URL_SERVICIOS + '/desunir_pdf';

    return this.http.post(URL, formData, { headers, responseType: 'blob' }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }
  

   iniciarProceso(file: File): Observable<{ jobId: string }> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const formData = new FormData();
    formData.append('archivo_pdf', file);

    const URL = URL_SERVICIOS + '/iniciar_proceso_pdf'; // endpoint que debes crear

    return this.http.post<{ jobId: string }>(URL, formData, { headers });
  }


  iniciarProcesoEgreso(file: File): Observable<{ jobId: string }> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const formData = new FormData();
    formData.append('archivo_pdf', file);

    const URL = URL_SERVICIOS + '/iniciarprocesoegresopdf'; // endpoint que debes crear

    return this.http.post<{ jobId: string }>(URL, formData, { headers });
  }


  descargarExcelSeguro(): Observable<Blob> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
  
    // Usamos la URL que ya conoces
    const URL = URL_SERVICIOS + '/exportar_excel';
    
    // IMPORTANTE: responseType: 'blob' le dice a Angular que viene un archivo, no un JSON
    return this.http.get(URL, { 
      headers: headers, 
      responseType: 'blob' 
    });
  }

  obtenerProgreso(jobId: string): Observable<ProgresoResponse> {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const URL = URL_SERVICIOS + `/progreso_pdf/${jobId}`;

  return this.http.get<ProgresoResponse>(URL, { headers });
}



  descargarZip(jobId: string): Observable<Blob> {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const URL = URL_SERVICIOS + `/descargar_pdf/${jobId}`;

  return this.http.get(URL, { headers, responseType: 'blob' });
}



}
