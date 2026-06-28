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


getAuditoriaUsuario(userId: string) {
  const URL = `${URL_SERVICIOS}/auditoria/usuario`; // Endpoint que crearemos en Laravel
  return this.http.post(URL, { user_id: userId }, {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token,
      'Content-Type': 'application/json'
    })
  });
}



getAuditoriaFiltrada(filtros: any) {
  const URL = `${URL_SERVICIOS}/auditoria/filtrar`; // Tu nuevo endpoint en Laravel
  
  // El body incluirá: user_id, actividad_id, fecha_inicio, fecha_fin
  return this.http.post(URL, filtros, {
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
getActividadesUnicas(userId: any) {
  const URL = `${URL_SERVICIOS}/auditoria/actividades-usuario`;
  return this.http.post(URL, { user_id: userId }, {
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
