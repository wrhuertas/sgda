import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS, URL_BACKEND } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class AsignartramiteService {

  
    isLoading$: Observable<boolean>;
        isLoadingSubject: BehaviorSubject<boolean>;
      
        constructor(
          private http: HttpClient,
          public authservice: AuthService
        ) {
          this.isLoadingSubject = new BehaviorSubject<boolean>(false);
          this.isLoading$ = this.isLoadingSubject.asObservable();
        }

        private getHeaders(): HttpHeaders {
          const token = this.authservice.token || localStorage.getItem('token') || '';
          return new HttpHeaders({ 'Authorization': 'Bearer ' + token });
        }

        // Trae un anexo (PDF) como base64 a través de la API (evita CORS de /storage)
        verAnexoBase64(ruta: string) {
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + '/anexos/ver-base64';
          return this.http.post(URL, { ruta }, { headers });
        }
      
        
      
  
  
         listTramites(
          id_empresa: number,
          id_usuario: number,
          page: number = 1,
          search: string = ''
        ) {
          this.isLoadingSubject.next(true);

          const headers = this.getHeaders();

          const URL =
            URL_SERVICIOS +
            '/listadoasignartramites' +
            '?id_empresa=' + id_empresa +
            '&id_usuario=' + id_usuario +
            '&page=' + page +
            '&search=' + search;

          return this.http.get(URL, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

  
  
  
        configArea(id_usuario: number) {
          this.isLoadingSubject.next(true);
  
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/area/configarea";
  
          return this.http.post(URL, { id_usuario: id_usuario }, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }
  
  
        usuariosPorArea(id_area: number) {
          this.isLoadingSubject.next(true);
  
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/area/usuarioporarea";
  
          return this.http.post(URL, { id_area: id_area }, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }
  
  
        
      docuemntosTramite(id_tramite: number) {
          this.isLoadingSubject.next(true);
  
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/asignacion/documentostramite";
  
          return this.http.post(URL, { id_tramite: id_tramite }, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }
  
  
  
         GrabarasignarTramite(data: any) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/recepcion/grabarasignartramite";
            return this.http.post(URL, data, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }
  
  
  
  
          
        areaDestino(id_area_destino: number) {
          this.isLoadingSubject.next(true);
  
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/area/areadestino";
  
          return this.http.post(URL, { id_area_destino: id_area_destino }, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }
  
        usuarioDestino(id_usuario_destino: number) {
          this.isLoadingSubject.next(true);
  
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/area/usuariodestino";
  
          return this.http.post(URL, { id_usuario_destino: id_usuario_destino }, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }
          /*
                registrarasginacion(data: FormData) {
                  this.isLoadingSubject.next(true);
                
                  const headers = this.getHeaders();
                
                  const URL = URL_SERVICIOS + "/asignacion/registrarasginacion"; 
                
                  return this.http.post(URL, data, { headers }).pipe(
                    finalize(() => this.isLoadingSubject.next(false))
                  );
                }
        */

         configTipoDocumento(id_empresa: number) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/tipodocumento/configtipo";
            return this.http.post(URL, { id_empresa }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

          configTipoTramite(id_empresa: number) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/tipodocumento/configtipotramite";
            return this.http.post(URL, { id_empresa }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

          
        contarPorNumeroTramite(params: { id_tramite?: number; numero_tramite?: string }) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/tramite/count-por-numero";
          return this.http.post(URL, params, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

          datosLogeado(id_usuario: number) {
          this.isLoadingSubject.next(true);

          const headers = this.getHeaders();
          // Ajusta la ruta si tu backend expone otro endpoint
          const URL = URL_SERVICIOS + "/usuarios/datos-logeado";

          return this.http.post(URL, { id_usuario }, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

         getSecuencialMemorandum(id_empresa: number) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/tramite/get-secuencial-m";
            return this.http.post(URL, { id_empresa }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

                configtipo(id_empresa: any) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
            
            const URL = URL_SERVICIOS + "/tipodocumento/configtipo";
            
            // IMPORTANTE: En POST, el orden es (URL, BODY, OPTIONS)
            return this.http.post(URL, { id_empresa }, { headers }).pipe(
                finalize(() => this.isLoadingSubject.next(false))
            );
        }


        configtipotramite(id_empresa: any) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          
          const URL = URL_SERVICIOS + "/tipodocumento/configtipotramite";
          return this.http.post(URL, { id_empresa }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
          );
      }


      cargarempresaidVistaPrevia(idEmpresa: number) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
        
            const URL = `${URL_SERVICIOS}/traerDatosEmpresaVistaPrevia/${idEmpresa}`;
        
            return this.http.get(URL, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

        asignarTramite(data: FormData) {
          this.isLoadingSubject.next(true);

          const headers = this.getHeaders();

          const URL = URL_SERVICIOS + "/asignacion/registrarasginacion";

          return this.http.post(URL, data, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
         }

        /**
         * Crea un trámite nuevo por memorandum. A diferencia de asignarTramite,
         * no parte de un trámite existente: el memorandum abre el flujo.
         */
        crearTramite(data: FormData) {
          this.isLoadingSubject.next(true);

          const headers = this.getHeaders();

          const URL = URL_SERVICIOS + "/asignacion/creartramite";

          return this.http.post(URL, data, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
         }

        // Traer acta por id de asignación (envía solo el id_asignacion al backend)
        traerActaAsignacion(id_asignacion: number) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/asignacion/traerActa";
          return this.http.post(URL, { id_asignacion }, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

        // Enviar id y ruta al backend (método genérico).
        // Enviar id y ruta al backend (método genérico).
        // El endpoint '/asignacion/datosidruta' espera devolver imágenes u otros datos.
        enviarIdYRuta(payload: { id_asignacion: number; ruta?: string }) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + '/asignacion/datosidruta';
          return this.http.post(URL, payload, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

        // Trazabilidad del trámite (mismo endpoint que Despacho): tramite + asignaciones + actas
        traerDatosAsinacion(payload: { id_asignacion_tramite: number; id_empresa: number; id_usuario: number; id_tramite: number; }) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/despacho/traerDatosAsignacion";
          return this.http.post(URL, payload, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

        // Cargar actas específicas (mismo endpoint que Despacho)
        cargarActas(payload: { id_asignacion_tramite?: number; id_empresa: number; id_usuario: number; id_tramite?: number }) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/despacho/cargarActas";
          return this.http.post(URL, payload, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

        // Obtener imagen previa de una acta (por página) (mismo endpoint que Despacho)
        obtenerImagenActa(payload: { id_acta?: number; id_asignacion_tramite?: number; id_tramite?: number; id_empresa: number; id_usuario: number; page?: number }) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/despacho/imagenActa";
          return this.http.post(URL, payload, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

        // Método específico para el flujo de "retararsumillado" (envío distinto para sumillado)
        retararsumillado(payload: any) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + '/asignacion/retararsumillado';
          return this.http.post(URL, payload, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

        // Descargar un archivo desde la carpeta storage (permite pasar headers de auth)
        downloadStorageFile(ruta: string) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const base = URL_BACKEND ? String(URL_BACKEND).replace(/\/$/, '') : String(URL_SERVICIOS).replace(/\/$/, '');
          const URL = `${base}/storage/${ruta}`;
          return this.http.get(URL, { headers, responseType: 'blob' as 'blob' }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

        // Descargar acta por id de asignación vía endpoint API (devuelve blob)
        descargarActaById(id_asignacion: number) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + '/asignacion/descargarActa';
          return this.http.post(URL, { id_asignacion }, { headers, responseType: 'blob' as 'blob' }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

        // Descargar acta pero solicitando que el backend inserte una sumilla dentro del PDF
        descargarActaConSumilla(id_asignacion: number, textoSumillar: string) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + '/asignacion/descargarActaConSumilla';
          return this.http.post(URL, { id_asignacion, texto_sumillar: textoSumillar }, { headers, responseType: 'blob' as 'blob' }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

        generarActaConSumilla(payload: any) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + '/asignacion/generarActaConSumilla';
          return this.http.post(URL, payload, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

       cargarempresaid(idEmpresa: number) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
        
            const URL = `${URL_SERVICIOS}/empresaid/${idEmpresa}`;
        
            return this.http.get(URL, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }


         grabarTramite(data: FormData) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/recepcion/grabartramite";
          return this.http.post(URL, data, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

        
      datosTramite(id_tramite: number) {
          this.isLoadingSubject.next(true);
  
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/tramite/traerDatos";
  
          return this.http.post(URL, { id_tramite: id_tramite }, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }

         // Valida o trae datos de la firma del usuario logueado
      validarFirma(id_usuario: number) {
        this.isLoadingSubject.next(true);

        const headers = this.getHeaders();
        // Ajusta la ruta si tu backend expone otro endpoint
        const URL = URL_SERVICIOS + "/usuarios/validar-firma";

        return this.http.post(URL, { id_usuario }, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }


      buscarUsuariosSistema(
            filtro: string,
            id_empresa: number,
            id_usuario: number,
            tipo: string = 'servidor'
          ): Observable<any> {
            this.isLoadingSubject.next(true);

            const headers = this.getHeaders();

            // Construcción de la URL con los parámetros necesarios
            const URL =
              URL_SERVICIOS +
              "/usuarios/buscargeneral" +
              "?search=" + encodeURIComponent(filtro) +
              "&id_empresa=" + id_empresa +
              "&id_usuario_solicitante=" + id_usuario +
              // 'servidor' (por defecto) o 'ciudadano' para buscar clientes
              "&tipo=" + encodeURIComponent(tipo || 'servidor');
        
            return this.http.post(URL, {}, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

          seguimientosTramite(id_tramite: number) {
            this.isLoadingSubject.next(true);

            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/tramite/seguimientosTramite";

            return this.http.post(URL, { id_tramite: id_tramite }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

          obtenerDocumentoTramite(id_documento_tramite: number): Observable<Blob> {
            this.isLoadingSubject.next(true);

            const headers = this.getHeaders();
            const URL = `${URL_SERVICIOS}/tramite/documento-tramite/${id_documento_tramite}`;

            return this.http.get(URL, { headers, responseType: 'blob' }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }


          asginartramite(data: any) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/asignacion/registrarasginacion";
            return this.http.post(URL, data, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }
          
          getSecuencialMemorandumRecepcion(id_empresa: number, prefijo: string = '') {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/recepcion/get-secuencial-memorandum";
            return this.http.post(URL, { id_empresa, prefijo }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

             firmarDocumento(formData: FormData) {
                const url = `${URL_SERVICIOS}/asignacion/firmar-documento`;
              
                const headers = new HttpHeaders({
                  'Authorization': 'Bearer ' + this.authservice.token
                });
              
                return this.http.post(url, formData, {
                  headers: headers,
                  reportProgress: true,
                  observe: 'events'
                });
              }



            validarfirma(usuario_id: number) {
            this.isLoadingSubject.next(true);
    
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/usuarios/validar-firma";
    
            return this.http.post(URL, { id_usuario: usuario_id }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }
    

}
