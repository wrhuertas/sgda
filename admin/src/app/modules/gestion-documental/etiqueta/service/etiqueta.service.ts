import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from '../../../auth';

@Injectable({
  providedIn: 'root'
})
export class EtiquetaService {

  constructor(
    private http: HttpClient,
    private authservice: AuthService
  ) { }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
  }

  /**
   * Árbol completo para el selector: secciones -> subsecciones -> (sub-subsecciones)
   * -> series -> hijos (subseries). Es el mismo endpoint que usa Reportería.
   */
  selectSecciones(id_usuario: number): Observable<any> {
    const URL = `${URL_SERVICIOS}/seccion/selectseccion`;
    return this.http.post(URL, { id_usuario }, { headers: this.headers() });
  }

  // Ubicaciones topográficas (edificio / sala) de una serie o subserie
  listarLugaresPorSerie(payload: { id_serie: number }): Observable<any> {
    const URL = `${URL_SERVICIOS}/rutadocumento/listar-lugares-serie`;
    return this.http.post(URL, payload, { headers: this.headers() });
  }

  // Todas las ubicaciones de la empresa, paginadas
  listarLugaresPorEmpresa(payload: {
    id_empresa: number;
    page?: number;
    per_page?: number;
    search?: string;
  }): Observable<any> {
    const URL = `${URL_SERVICIOS}/rutadocumento/listar-lugares-empresa`;
    return this.http.post(URL, payload, { headers: this.headers() });
  }

  // Etiquetas generadas (tabla etiquetas)
  listarEtiquetas(payload: {
    id_empresa: number;
    page?: number;
    per_page?: number;
    search?: string;
  }): Observable<any> {
    const URL = `${URL_SERVICIOS}/etiquetas/listar`;
    return this.http.post(URL, payload, { headers: this.headers() });
  }

  guardarEtiqueta(payload: {
    ruta: string;
    id_empresa: number;
    id_usuario: number;
    id_serie_subserie: number | null;
    id_edificio?: number | null;
    id_sala?: number | null;
    id_estanteria?: number | null;
    id_fila?: number | null;
    id_caja?: number | null;
    id_carpeta?: number | null;
  }): Observable<any> {
    const URL = `${URL_SERVICIOS}/etiquetas/guardar`;
    return this.http.post(URL, payload, { headers: this.headers() });
  }

  // Datos de la etiqueta ya resueltos a nombres, para armar el rótulo
  datosEtiqueta(id: number): Observable<any> {
    const URL = `${URL_SERVICIOS}/etiquetas/datos/${id}`;
    return this.http.post(URL, {}, { headers: this.headers() });
  }

  /** Rehace el contenido del QR con los campos elegidos */
  actualizarContenido(id: number, payload: { campos: string[]; id_usuario: number }): Observable<any> {
    const URL = `${URL_SERVICIOS}/etiquetas/contenido/${id}`;
    return this.http.post(URL, payload, { headers: this.headers() });
  }

  /** Lo mismo, pero para el contenido del código de barras */
  actualizarContenidoBarra(id: number, payload: { campos: string[]; id_usuario: number }): Observable<any> {
    const URL = `${URL_SERVICIOS}/etiquetas/contenido-barra/${id}`;
    return this.http.post(URL, payload, { headers: this.headers() });
  }

  actualizarEtiqueta(id: number, payload: {
    ruta: string;
    id_empresa: number;
    id_usuario: number;
    id_serie_subserie: number | null;
    id_edificio?: number | null;
    id_sala?: number | null;
    id_estanteria?: number | null;
    id_fila?: number | null;
    id_caja?: number | null;
    id_carpeta?: number | null;
  }): Observable<any> {
    const URL = `${URL_SERVICIOS}/etiquetas/actualizar/${id}`;
    return this.http.post(URL, payload, { headers: this.headers() });
  }

  eliminarEtiqueta(id: number): Observable<any> {
    const URL = `${URL_SERVICIOS}/etiquetas/eliminar/${id}`;
    return this.http.post(URL, {}, { headers: this.headers() });
  }
}
