import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class IndexacionService {

  isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;

  constructor(
    private http: HttpClient,
    public authservice: AuthService
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  // ✅ Registrar una nueva indexación
   registrarDocumento(data: any): Observable<any> {
  this.isLoadingSubject.next(true);

  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const URL = `${URL_SERVICIOS}/indexaciones`;

  return this.http.post(URL, data, { headers }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}

  // ✅ Listar indexaciones por id_modulo (ejemplo)
  listIndexaciones(idModulo: number) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = `${URL_SERVICIOS}/indexaciones?modulo_id=${idModulo}`;
    return this.http.get(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  subirArchivos(data: FormData): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
      // No pongas Content-Type, Angular lo define automáticamente para FormData
    });

    const URL = `${URL_SERVICIOS}/indexaciones/upload`; // Cambia esta ruta según tu API
    return this.http.post(URL, data, { headers });
  }

   // Servicio para obtener campos_extra (POST sin payload o con filtros)
  obtenerCamposExtra(filtros: any = {}): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const url = `${URL_SERVICIOS}/indexaciones/obtenerCampos`;

    return this.http.post(url, filtros, { headers });
  }


  listIndexacionesBusqueda(page = 1, filtros: any = {}) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const url = `${URL_SERVICIOS}/indexaciones/indexbusqueda?page=${page}`;
  return this.http.post(url, filtros, { headers });
    }



    
    prueba(data: any): Observable<any> {
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });

      const URL = `${URL_SERVICIOS}/prueba`;

      return this.http.post(URL, data, { headers });
    }





      getProyectoById(id: number): Observable<any> {
        console.log('Enviando ID al backend:', id);
        this.isLoadingSubject.next(true);

        const headers = new HttpHeaders({
          Authorization: 'Bearer ' + this.authservice.token,
        });

        const url = `${URL_SERVICIOS}/DatosNombre`;

        // Enviamos como objeto con propiedad idProyecto
        return this.http
          .post(url, { id: id }, { headers })
          .pipe(finalize(() => this.isLoadingSubject.next(false)));
      }



        archivos(data: FormData): Observable<any> {
        const headers = new HttpHeaders({
          'Authorization': 'Bearer ' + this.authservice.token
          // No pongas Content-Type, Angular lo define automáticamente para FormData
        });

        const URL = `${URL_SERVICIOS}/indexaciones/uploads`; // Cambia esta ruta según tu API
        return this.http.post(URL, data, { headers });
      }

      separarPDF(nombreArchivo: string): Observable<{file: string, nombre: string}[]> {
          const headers = new HttpHeaders({
            'Authorization': 'Bearer ' + this.authservice.token
          });
          const URL = `${URL_SERVICIOS}/indexaciones/separar`; 
          return this.http.post<{file: string, nombre: string}[]>(URL, { nombreArchivo }, { headers });
        }


  // Aquí podrías agregar más métodos como updateIndexacion, deleteIndexacion, etc.
}
