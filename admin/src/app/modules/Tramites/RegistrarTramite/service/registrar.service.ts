import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class RegistrarService {

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
      
        registrarTramite(data: any) {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          const URL = URL_SERVICIOS + "/registrartramite";
          return this.http.post(URL, data, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }


        // Método para buscar por Cédula o RUC
        consultarDocumento(n_documento: string): Observable<any> {
          this.isLoadingSubject.next(true);
          const headers = this.getHeaders();
          
          // Ajusta la ruta "/cliente/buscar/" según como esté en tu API de Laravel/Backend
          const URL = URL_SERVICIOS + "/clienterecepcion/buscar/" + n_documento;
          
          return this.http.get(URL, { headers }).pipe(
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
          
          const URL = URL_SERVICIOS + "/tipotramiteempresa/" + id_empresa;
          return this.http.post(URL, {}, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
          );
      }

      tiposTramiteEmpresa(id_empresa: any) {
        this.isLoadingSubject.next(true);
        const headers = this.getHeaders();
        const URL = URL_SERVICIOS + "/tipotramiteempresa/" + id_empresa;
        return this.http.post(URL, {}, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }

      tiposDocumentoEmpresa(id_empresa: any) {
        this.isLoadingSubject.next(true);
        const headers = this.getHeaders();
        const URL = URL_SERVICIOS + "/tipodocumentoempresa/" + id_empresa;
        return this.http.post(URL, {}, { headers }).pipe(
          finalize(() => this.isLoadingSubject.next(false))
        );
      }

      verificarUsuario(id_empresa: any, id_usuario: any) {
        this.isLoadingSubject.next(true);
        let headers = this.getHeaders();
        let URL = URL_SERVICIOS + "/tipodocumento/verificarusuario";
        
        // Enviamos el objeto con ambas propiedades
        const body = { 
            id_empresa: id_empresa, 
            id_usuario: id_usuario 
        };
        
        return this.http.post(URL, body, { headers: headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }


        configArea(id_empresa: any) {
            this.isLoadingSubject.next(true);
            let headers = this.getHeaders();
            
            let URL = URL_SERVICIOS + "/areas/configarea?id_empresa=" + id_empresa;
            
            // IMPORTANTE: En POST, el orden es (URL, BODY, OPTIONS)
            return this.http.post(URL, {}, { headers: headers }).pipe(
                finalize(() => this.isLoadingSubject.next(false))
            );
        }






        configSeccion(id_empresa: any) {
          this.isLoadingSubject.next(true);
          let headers = this.getHeaders();
          
          let URL = URL_SERVICIOS + "/secciones/configseccion?id_empresa=" + id_empresa;
          
          // IMPORTANTE: En POST, el orden es (URL, BODY, OPTIONS)
          return this.http.post(URL, {}, { headers: headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
          );
      }







        getSecuencial(id_tipodocumento: any, id_empresa: any) {
          let headers = this.getHeaders();
          let URL = URL_SERVICIOS + "/tipodocumento/get-secuencial";
          
          // Enviamos los datos necesarios para que Laravel busque el último registro
          let data = {
              id_tipodocumento: id_tipodocumento,
              id_empresa: id_empresa
          };

          return this.http.post(URL, data, { headers: headers });
      }


      getClienteId(id_usuariologeado: any) {
        let headers = this.getHeaders();
        let URL = URL_SERVICIOS + "/getdatoscliente"; // <-- cambia a la ruta correcta de tu API
    
        let data = {
          id_usuariologeado: id_usuariologeado
        };
    
        return this.http.post(URL, data, { headers: headers });
      }
      
      cargarempresaid(idEmpresa: number) {
            this.isLoadingSubject.next(true);
            const headers = this.getHeaders();
        
            const URL = `${URL_SERVICIOS}/empresaid/${idEmpresa}`;
        
            return this.http.get(URL, { headers }).pipe(
              finalize(() => this.isLoadingSubject.next(false))
            );
          }
}
