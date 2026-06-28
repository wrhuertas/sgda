import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from '../../auth';

@Injectable({
  providedIn: 'root'
})
export class SubserieService {

    isLoading$: Observable<boolean>;
    private isLoadingSubject: BehaviorSubject<boolean>;
  
    constructor(private http: HttpClient, private authservice: AuthService) {
      this.isLoadingSubject = new BehaviorSubject<boolean>(false);
      this.isLoading$ = this.isLoadingSubject.asObservable();
    }
  
    // Nuevo método para traer datos del proyecto por id
    getSubSeccionById(idSerie: number): Observable<any> {
      console.log('Enviando ID al backend:', idSerie);
      this.isLoadingSubject.next(true);
  
      const headers = new HttpHeaders({
        Authorization: 'Bearer ' + this.authservice.token,
      });
  
      const url = `${URL_SERVICIOS}/DatosSerie`;
  
      // Enviamos como objeto con propiedad idSubSeccion
      return this.http
        .post(url, { idSerie: idSerie }, { headers })
        .pipe(finalize(() => this.isLoadingSubject.next(false)));
    }
  
    // Obtener subsecciones de un proyecto
    listSubSerie(
      idSerie: number,
      page: number = 1,
      search: string = ''
    ): Observable<any> {
      this.isLoadingSubject.next(true);
  
      const headers = new HttpHeaders({
        Authorization: 'Bearer ' + this.authservice.token,
      });
  
      const url = `${URL_SERVICIOS}/listarsubserie?idSerie=${idSerie}&page=${page}&search=${search}`;
  
      return this.http
        .get(url, { headers })
        .pipe(finalize(() => this.isLoadingSubject.next(false)));
    }
  
    // Método para registrar Sub Sección
    guardarSubSerie(data: any): Observable<any> {
      this.isLoadingSubject.next(true);

      const headers = new HttpHeaders({
        Authorization: 'Bearer ' + this.authservice.token,
      });

      const url = `${URL_SERVICIOS}/subSerieStore`;

      return this.http
        .post(url, data, { headers })
        .pipe(finalize(() => this.isLoadingSubject.next(false)));
    }

    permisosUsuario(ID_USER: string) {
      this.isLoadingSubject.next(true);
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
      const URL = URL_SERVICIOS + "/users/permisos-documentales/" + ID_USER;
      return this.http.post(URL, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }


          // 🔸 Actualizar proyecto
  updateSubSerie(idSubSerie: string, data: any) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = URL_SERVICIOS + "/actualizarsubserie/" + idSubSerie;
  
    // Este append aquí puede causar duplicados si ya lo hiciste en el componente
    // data.append('_method', 'PUT'); 
  
    return this.http.post(URL, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Guardar selección (QR=1, Barra=2) mientras se crea/edita Subserie
  guardarParametroSeleccionSubserie(data: any): Observable<any> {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const url = `${URL_SERVICIOS}/subserie/guardar-parametro-qr-barra`;
    return this.http.post(url, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  eliminarParametroSeleccionSubserie(data: any): Observable<any> {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const url = `${URL_SERVICIOS}/subserie/eliminar-parametro-qr-barra`;
    return this.http.post(url, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }


      // 🔸 Eliminar proyecto
      EliminarSubSerie(idSerie: string) {
        this.isLoadingSubject.next(true);
        const headers = new HttpHeaders({
          'Authorization': 'Bearer ' + this.authservice.token
        });
        const URL = URL_SERVICIOS + "/eliminarSerie";
      
        return this.http.post(URL, { idSerie }, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }



         obtenerDatosParametro(data: any): Observable<any> {
          this.isLoadingSubject.next(true);
          const headers = new HttpHeaders({
            'Authorization': 'Bearer ' + this.authservice.token
          });
          const url = `${URL_SERVICIOS}/serie/obtener-parametros-qr-barra`; // Ajusta el endpoint final según tu api.php si es necesario
          return this.http.post(url, data, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

}
