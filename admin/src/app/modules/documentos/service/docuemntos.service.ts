import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { AuthService } from '../../auth';
import { URL_BACKEND, URL_SERVICIOS } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class DocumentosService {

  isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;

  constructor(
    private http: HttpClient,
    public authservice: AuthService
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  getProyectosEscalera(): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/getDocumentos`;

    return this.http.post<any>(URL, {}, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false)) // 👈 aquí apaga el loader
    );
  }


   getPdfUrl(rutaRelativa: string): string {
  // URL_SERVICIOS = 'http://127.0.0.1:8000/' sin '/api'
  return `${URL_BACKEND}${rutaRelativa}`;
}


getImagenesPDF(archivo: string): Observable<string[]> {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const URL = `${URL_BACKEND}getImagenesPDF`;

  return this.http.post<{ imagenes: string[] }>(URL, { archivo }, { headers })
    .pipe(map(res => res.imagenes));
}

enviarPDF(payload: { archivo_url: string }): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token,
      'Content-Type': 'application/json'
    });

    const URL = `${URL_SERVICIOS}/enviarPDF`; // Tu endpoint en Laravel

    return this.http.post(URL, payload, { headers });
  }


  // Obtener usuarios de una empresa
  getUsuariosByEmpresa(id_empresa: number): Observable<any[]> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/usuarios/empresa`;

    const payload = { id_empresa };

    return this.http.post<{ usuarios: any[] }>(URL, payload, { headers })
      .pipe(map(res => res.usuarios));
  }



    // ==================== ELIMINAR DOCUMENTO ====================
  eliminarDocumento(id_documento: number): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = `${URL_BACKEND}documentos/${id_documento}`;

    return this.http.delete(URL, { headers });
  }

 guardarPermisosCarpetas(data: any) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = URL_SERVICIOS + "/permisoscarpetas";
    return this.http.post(URL, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }




  
 getPermisosPorCarpeta(payload: { id_carpeta: string, id_empresa: string, id_usuario: string }) {
  this.isLoadingSubject.next(true);

  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  return this.http.post(URL_SERVICIOS + '/permisoscarpetas/get', payload, { headers })
    .pipe(finalize(() => this.isLoadingSubject.next(false)));
}



// 🔹 Obtener permisos del usuario logeado
  getPermisosPorUsuario(id_usuario: string | number) {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const payload = {
      id_usuario: id_usuario.toString()
    };

    return this.http.post<any[]>(URL_SERVICIOS + '/permisoscarpetas/get-usuario', payload, { headers })
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }



  firmarPDF(data: any): Observable<any> {
  this.isLoadingSubject.next(true);

  const url = `${URL_SERVICIOS}/firmar-pdf`; // 🔹 o `${URL_BACKEND}/firmar-pdf` según tu config
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  return this.http.post(url, data, { headers }).pipe(
    finalize(() => this.isLoadingSubject.next(false)),
    map((resp: any) => resp)
  );
}


/*getUsuariosByEmpresa(id_empresa: number) {
  return this.http.get<any[]>(`/api/usuarios/empresa/${id_empresa}`);
}

getPermisosProyecto(id_proyecto: number) {
  return this.http.get<any[]>(`/api/permisos-proyecto/${id_proyecto}`);
}

guardarPermisosProyecto(permisos: any[]) {
  return this.http.post(`/api/permisos-proyecto/guardar`, { permisos });
}*/




}
