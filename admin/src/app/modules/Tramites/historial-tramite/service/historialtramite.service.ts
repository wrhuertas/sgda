import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class HistorialtramiteService {

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
              '/listadohistorialtramites' +
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

        const URL = URL_SERVICIOS + "/recepcion/asignartramite"; 

        return this.http.post(URL, data, { headers }).pipe(
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

        // Buscar usuarios del sistema (misma ruta que RecepcionService)
        buscarUsuariosSistema(
          filtro: string,
          id_empresa: number,
          id_usuario: number
        ) {
          this.isLoadingSubject.next(true);

          const headers = this.getHeaders();
          const URL =
            URL_SERVICIOS +
            "/usuarios/buscargeneral" +
            "?search=" + encodeURIComponent(filtro) +
            "&id_empresa=" + id_empresa +
            "&id_usuario_solicitante=" + id_usuario;

          return this.http.post(URL, {}, { headers }).pipe(
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

  
      usuarioDestino(id_usuario_destino: number) {
        this.isLoadingSubject.next(true);

        const URL = URL_SERVICIOS + "/area/usuariodestino";

        return this.http.post(URL, { id_usuario_destino: id_usuario_destino }).pipe(
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

}
