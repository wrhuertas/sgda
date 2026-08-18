import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { AuthService } from '../../auth';
import { URL_SERVICIOS } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;
  
  constructor(
    private http: HttpClient,
    public authservice: AuthService,
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }


   registarArea(data: any) {
      this.isLoadingSubject.next(true);
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
      const URL = URL_SERVICIOS + "/registarArea";
      return this.http.post(URL, data, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }

  registerUser(data:any) {
    this.isLoadingSubject.next(true);
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS+"/users";
    return this.http.post(URL,data,{headers: headers}).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  listUsers(page = 1,search:string = ''){
    this.isLoadingSubject.next(true);
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS+"/users?page="+page+"&search="+search;
    return this.http.get(URL,{headers: headers}).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Listado de Super Usuarios (solo usuarios con super_usuario = 1)
  listSuperUsuarios(search: string = ''){
    this.isLoadingSubject.next(true);
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS+"/super-usuarios?search="+search;
    return this.http.get(URL,{headers: headers}).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Crear un Super Usuario (super_usuario = 1)
  createSuperUsuario(data: any){
    this.isLoadingSubject.next(true);
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS+"/super-usuarios";
    return this.http.post(URL, data, {headers: headers}).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Actualizar un Super Usuario
  updateSuperUsuario(id: any, data: any){
    this.isLoadingSubject.next(true);
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS+"/super-usuarios/"+id;
    return this.http.post(URL, data, {headers: headers}).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Eliminar un Super Usuario
  deleteSuperUsuario(id: any){
    this.isLoadingSubject.next(true);
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS+"/super-usuarios/"+id;
    return this.http.delete(URL, {headers: headers}).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  configAll(){
    this.isLoadingSubject.next(true);
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS+"/users/config";
    return this.http.get(URL,{headers: headers}).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  
 ListraRoles(id_empresa: any) {
    this.isLoadingSubject.next(true);
    
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS + "/users/listar-roles";
    
    // Enviamos el id_empresa dentro del cuerpo (body) de la petición POST
    return this.http.post(URL, { id_empresa: id_empresa }, { headers: headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
    );
}
/*
 ListarSucursales(id_empresa: any) {
    this.isLoadingSubject.next(true);
    
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS + "/users/listar-sucursales";
    
    // Enviamos el id_empresa dentro del cuerpo (body) de la petición POST
    return this.http.post(URL, { id_empresa: id_empresa }, { headers: headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
    );
}
*/
 ListarSecciones(id_empresa: any) {
    this.isLoadingSubject.next(true);
    
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS + "/users/listar-secciones";
    
    // Enviamos el id_empresa dentro del cuerpo (body) de la petición POST
    return this.http.post(URL, { id_empresa: id_empresa }, { headers: headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
    );
}


   configSecciones(){
    this.isLoadingSubject.next(true);
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS+"/users/secciones";
    return this.http.get(URL,{headers: headers}).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  updateUser(ID_USER:string,data:any) {
    this.isLoadingSubject.next(true);
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS+"/users/"+ID_USER;
    return this.http.post(URL,data,{headers: headers}).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  deleteUser(ID_USER:string) {
    this.isLoadingSubject.next(true);
    let headers = new HttpHeaders({'Authorization': 'Bearer '+ this.authservice.token});
    let URL = URL_SERVICIOS+"/users/"+ID_USER;
    return this.http.delete(URL,{headers: headers}).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }


   


     getPermissionsByEmpresa(idEmpresa: number) {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/users/permisosEmpresa/${idEmpresa}`;

    // En POST, los headers van en el tercer parámetro, no en el body
    return this.http.post(URL, {}, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }


  // users.service.ts
checkEmail(email: string) {

  this.isLoadingSubject.next(true);

  let headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  let URL = URL_SERVICIOS + '/check-email';

  return this.http.post<boolean>(
    URL,
    { email },
    { headers }
  ).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}


configSeccion(id_empresa: any) {
  this.isLoadingSubject.next(true);
  let headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
  
  let URL = URL_SERVICIOS + "/secciones/configseccion?id_empresa=" + id_empresa;
  
  // IMPORTANTE: En POST, el orden es (URL, BODY, OPTIONS)
  return this.http.post(URL, {}, { headers: headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
  );
}


// --- users.service.ts ---

listarSeccionesRaiz(id_empresa: any, id_user: any): Observable<any> {
    const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
    const URL = URL_SERVICIOS + "/users/listar-secciones-raiz"; 
    return this.http.post(URL, { id_empresa: id_empresa, id_user: id_user }, { headers: headers });
}

listarHijos(padre_id: any, id_user: any): Observable<any> {
    const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
    const URL = URL_SERVICIOS + "/users/listar-hijos"; 
    return this.http.post(URL, { padre_id: padre_id, id_user: id_user }, { headers: headers });
}

listarSeriesRaiz(id_subseccion: any, id_user: any): Observable<any> {
    const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
    const URL = URL_SERVICIOS + "/users/listar-series-raiz"; 
    return this.http.post(URL, { id_subseccion: id_subseccion, id_user: id_user }, { headers: headers });
}

  listarSeriesHijas(padre_id: any, id_user: any): Observable<any> {
      const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
      const URL = URL_SERVICIOS + "/users/listar-series-hijas"; 
      return this.http.post(URL, { padre_id: padre_id, id_user: id_user }, { headers: headers });
  }

  // Trae permisos documentales actuales del usuario
  getPermisosDocumentalesUsuario(id_user: any): Observable<any> {
    const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
    const URL = URL_SERVICIOS + "/users/permisos-documentales/" + id_user;
    // Backend espera POST en esta ruta
    return this.http.post(URL, {}, { headers });
  }

  // Devuelve qué nodos del árbol hay que abrir para dejar a la vista los permisos ya marcados
  getRutasPermisosDocumentales(id_user: any): Observable<any> {
    const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
    const URL = URL_SERVICIOS + "/users/permisos-documentales/" + id_user + "/rutas";
    return this.http.post(URL, {}, { headers });
  }

  // Guarda permisos documentales del usuario en su propio endpoint dedicado
  guardarPermisosDocumentales(id_user: any, permisos_documentales: any[]): Observable<any> {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({'Authorization': 'Bearer ' + this.authservice.token});
    const URL = URL_SERVICIOS + "/users/permisos-documentales/" + id_user + "/guardar";
    const body = { permisos_documentales };
    return this.http.post(URL, body, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

}
