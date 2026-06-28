import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class RecepcionService {

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
    return new HttpHeaders({
      'Authorization': 'Bearer ' + token
    });
  }
    
      
    


        listTramites(
        id_empresa: number,
        page: number = 1,
        search: string = ''
      ) {
        this.isLoadingSubject.next(true);
        const headers = this.getHeaders();

        const URL =
          URL_SERVICIOS +
          "/tramites" +
          "?id_empresa=" + id_empresa +
          "&page=" + page +
          "&search=" + search;

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
        const URL = URL_SERVICIOS + "/area/documentostramite";

        return this.http.post(URL, { id_tramite: id_tramite }, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }


       asginartramite(data: any) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/recepcion/asignartramite";
          return this.http.post(URL, data, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }


        

        getTiposDocumento(id_empresa: any) {
          this.isLoadingSubject.next(true);
      
          const headers = this.getHeaders();
      
          const URL = URL_SERVICIOS + "/tipodocumentoempresa/" + id_empresa;
      
          return this.http.post(URL, {}, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
          );
      }

        
        areaDestino(id_area_destino: number, id_empresa: any) {
          this.isLoadingSubject.next(true);
      
          const URL = URL_SERVICIOS + "/area/areadestino";
      
          return this.http.post(URL, { 
              id_area_destino: id_area_destino,
              id_empresa: id_empresa 
          }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
          );
      }

      usuarioDestino(id_usuario_destino: number) {
        this.isLoadingSubject.next(true);

        const URL = URL_SERVICIOS + "/area/usuariodestino";

        return this.http.post(URL, { id_usuario_destino: id_usuario_destino }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }

  asignarTramite(data: FormData) {
        this.isLoadingSubject.next(true);

        const headers = this.getHeaders();

        const URL = URL_SERVICIOS + "/recepcion/asignartramite"; 

        return this.http.post(URL, data, { headers }).pipe(
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


  


  grabarTramite(data: FormData) {
    this.isLoadingSubject.next(true);
    const headers = this.getHeaders();
    const URL = URL_SERVICIOS + "/recepcion/grabartramite";
    return this.http.post(URL, data, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  guardarBorradorDestinatarios(payload: {
    id_tramite: number;
    para: Array<{ id_usuario: number }>;
    copia: Array<{ id_usuario: number }>;
    de: Array<{ id_usuario: number }>;
  }) {
    this.isLoadingSubject.next(true);
    const headers = this.getHeaders();
    // Ruta existente en api.php para guardar borradores (TramiteController@regitrarTramiteBorrador)
    const URL = URL_SERVICIOS + "/recepcion/guardar-borrador";
    return this.http.post(URL, payload, { headers }).pipe(
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



        seguimientosTramite(id_tramite: number) {
            this.isLoadingSubject.next(true);

            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/tramite/seguimientosTramite";

            return this.http.post(URL, { id_tramite: id_tramite }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

        // Obtener movimientos/asignaciones del trámite
        movimientosTramite(id_tramite: number) {
            this.isLoadingSubject.next(true);

            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/tramite/movimientos";

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

  contarPorNumeroTramite(params: { id_tramite?: number; numero_tramite?: string }) {
    this.isLoadingSubject.next(true);
    const headers = this.getHeaders();
    const URL = URL_SERVICIOS + "/tramite/count-por-numero";
    return this.http.post(URL, params, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }


          crearTramite(id_tramite: number) {
            this.isLoadingSubject.next(true);

            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/tramite/seguimientosTramite";

            return this.http.post(URL, { id_tramite: id_tramite }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }   


          buscarUsuariosSistema(
            filtro: string, 
            id_empresa: number, 
            id_usuario: number
          ): Observable<any> {
            this.isLoadingSubject.next(true);
        
            const headers = this.getHeaders();
        
            // Construcción de la URL con los parámetros necesarios
            const URL = 
              URL_SERVICIOS + 
              "/usuarios/buscargeneralRecepcion" + 
              "?search=" + encodeURIComponent(filtro) + 
              "&id_empresa=" + id_empresa + 
              "&id_usuario_solicitante=" + id_usuario;
        
            return this.http.post(URL, {}, { headers }).pipe(
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


          cargarempresaidVistaPrevia(idEmpresa: number) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
        
            const URL = `${URL_SERVICIOS}/traerDatosEmpresaVistaPrevia/${idEmpresa}`;
        
            return this.http.get(URL, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

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

          getSecuencial(id_tipodocumento: number, id_empresa: number) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/tipodocumento/get-secuencial";
            return this.http.post(URL, { id_tipodocumento, id_empresa }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

          registrarTramite(data: FormData) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/registrartramite";
            return this.http.post(URL, data, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

          // 🔹 Nueva función para obtener secuencial de Memorandum en Recepción
          getSecuencialMemorandumRecepcion(id_empresa: number) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
            const URL = URL_SERVICIOS + "/recepcion/get-secuencial-memorandum";
            return this.http.post(URL, { id_empresa }, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }

}

