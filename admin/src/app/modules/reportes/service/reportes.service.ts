import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from '../../auth';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {

  isLoading$: Observable<boolean>;
    private isLoadingSubject: BehaviorSubject<boolean>;

  constructor(
      private http: HttpClient,
      private authservice: AuthService
    ) {
      this.isLoadingSubject = new BehaviorSubject<boolean>(false);
      this.isLoading$ = this.isLoadingSubject.asObservable();
    }


    // Trae un documento (PDF) como base64 a través de la API (evita CORS de /storage)
    verDocumentoBase64(ruta: string): Observable<any> {
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
      const URL = URL_SERVICIOS + '/anexos/ver-base64';
      return this.http.post(URL, { ruta }, { headers });
    }

    SeccionSelect(id_usuario: number) {
      this.isLoadingSubject.next(true);
    
      // 1. Creamos los headers con el Token
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
    
      const URL = URL_SERVICIOS + "/seccion/selectseccion";
    
      // 2. IMPORTANTE: Debes pasar los headers como segundo o tercer argumento
      // En un POST, el segundo es el BODY y el tercero son las OPTIONS (donde van los headers)
      return this.http.post(URL, { id_usuario: id_usuario }, { headers: headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }



    getReporte(tipoReporte: string, data: any = {}) {
  this.isLoadingSubject.next(true);

  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  // La URL se arma según la opción seleccionada
  const URL = `${URL_SERVICIOS}/reporte/${tipoReporte}`;

  return this.http.post(URL, data, { headers }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}


exportarExcel(data: any) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  return this.http.post(URL_SERVICIOS + "/reporte/excel", data, {
    headers,
    responseType: 'blob'   // 👈 IMPORTANTE
  });
}


 // ✅ Función para enviar solo el ID del usuario
setUsuarioId(userId: string) {
  this.isLoadingSubject.next(true);

  const URL = `${URL_SERVICIOS}/auditoria/idusuario`;

  // 👇 Aquí enviamos el body directamente y los headers aparte
  return this.http.post(URL, { user_id: userId }, {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token,
      'Content-Type': 'application/json'
    })
  }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}


/**
 * Obtener auditoría de un usuario, opcionalmente filtrada por empresa.
 * @param userId id del usuario
 * @param idEmpresa (opcional) id de la empresa para filtrar
 */
getAuditoriaUsuario(userId: string, idEmpresa?: any, page: number = 1, buscar: string = '') {
  const URL = `${URL_SERVICIOS}/auditoria/usuario`;

  const body: any = {
    user_id: userId,
    page: page,
    per_page: 50
  };

  if (idEmpresa != null) body.id_empresa = idEmpresa;
  if (buscar) body.buscar = buscar;

  return this.http.post(URL, body, {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token,
      'Content-Type': 'application/json'
    })
  });
}



getAuditoriaFiltrada(filtros: any, page: number = 1, buscar: string = '') {
  const URL = `${URL_SERVICIOS}/auditoria/filtrar`; // Tu nuevo endpoint en Laravel

  const body: any = {
    ...filtros,
    page: page,
    per_page: 50
  };

  if (buscar) body.buscar = buscar;

  // El body incluirá: empresa_id, user_id, actividad_id, fecha_inicio, fecha_fin, page, per_page, buscar
  return this.http.post(URL, body, {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token,
      'Content-Type': 'application/json'
    })
  });
}

// En tu ReporteService
getAuditoriaPorEmpresa(idEmpresa: any) {
  const URL = `${URL_SERVICIOS}/auditoria/empresa`; 
  return this.http.post(URL, { id_empresa: idEmpresa }, {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token,
      'Content-Type': 'application/json'
    })
  });
}
/**
 * Tipos de actividad para el combo de filtros.
 * Con userId trae las de ese usuario; sin él, todas las de la empresa.
 */
getActividadesUnicas(userId: any, idEmpresa: any = null) {
  const URL = `${URL_SERVICIOS}/auditoria/actividades-usuario`;
  return this.http.post(URL, { user_id: userId, id_empresa: idEmpresa }, {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token,
      'Content-Type': 'application/json'
    })
  });
}


/**
 * Tipos de documento cargados en las series de la empresa.
 * Devuelve un objeto donde cada clave es el nombre del tipo de documento.
 */
getTiposDocumento(idEmpresa: any) {
  const URL = `${URL_SERVICIOS}/tipodocumentosrie/${idEmpresa}`;
  return this.http.post(URL, { id_empresa: idEmpresa }, {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token,
      'Content-Type': 'application/json'
    })
  });
}


exportarAuditoria(filtros: any, formato: 'pdf' | 'excel'): Observable<Blob> {
  this.isLoadingSubject.next(true);
  const headers = new HttpHeaders({ 
    'Authorization': `Bearer ${this.authservice.token}`,
    'Content-Type': 'application/json' 
  });
  
  // Enviamos los FILTROS (id_empresa, fechas, etc), no el array de datos
  return this.http.post(`${URL_SERVICIOS}/reportes/auditoria/exportar`, {
    ...filtros,
    formato: formato
  }, {
    headers,
    responseType: 'blob'
  }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}

}
