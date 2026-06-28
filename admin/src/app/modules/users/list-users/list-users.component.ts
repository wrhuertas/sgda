import { ChangeDetectorRef, Component } from '@angular/core';
import { CreateUserComponent } from '../create-user/create-user.component';
import { EditUserComponent } from '../edit-user/edit-user.component';
import { DeleteUserComponent } from '../delete-user/delete-user.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UsersService } from '../service/users.service';
import { isPermission } from 'src/app/config/config';
import { AreaRegistrarComponent } from '../area-registrar/area-registrar.component';
import { PermisosSeleccionComponent } from '../permisos-seleccion/permisos-seleccion.component';

@Component({
  selector: 'app-list-users',
  templateUrl: './list-users.component.html',
  styleUrls: ['./list-users.component.scss']
})
export class ListUsersComponent {
  
  search:string = '';
  USERS:any = [];
  isLoading$:any;
secciones: any[] = [];

  roles:any = [];
  sucursales:any = [];
  areas: any[] = [];
  id_empresa!: number;
  totalPages:number = 0;
  currentPage:number = 1;
  constructor(
    public modalService: NgbModal,
    public usersService: UsersService,
    public cdr: ChangeDetectorRef
  ) {
    
  }

  

  ngOnInit(): void {


    const user = JSON.parse(localStorage.getItem('user') || '{}');

     if (user && user.id_empresa) {
        this.id_empresa = user.id_empresa;
        // Llama a la función pasando el ID obtenido
        this.listarRoles(this.id_empresa); 
        //this.listarSucursales(this.id_empresa); 
     //   this.listarSecciones(this.id_empresa); 
      } else {
        console.error('Usuario sin empresa:', user);
      }
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.isLoading$ = this.usersService.isLoading$;
    this.listUsers();
    this.configAll();
   
  }

  listUsers(page = 1){
   
    this.usersService.listUsers(page,this.search).subscribe((resp:any) => {
      console.log(resp);
      this.USERS = resp.users;
      this.totalPages = resp.total;
      this.currentPage = page;
    })
  }

 

  
 configAll() {
  this.usersService.configAll().subscribe((resp: any) => {
    // El console.log te mostrará todo el objeto que viene de Laravel
    console.log("Respuesta completa del servidor:", resp);
    
   
    this.sucursales = resp.sucursales;
    
    // 2. Asignamos las áreas que vienen del nuevo controlador
    this.areas = resp.areas; 
    // ✅ AQUÍ ESTABA EL PROBLEMA
    //this.secciones = resp.secciones;
    

    // 3. Consola específica para ver si llegaron las áreas
    console.log("Lista de Áreas recibida:", this.areas);
  });
}


listarRoles(id_empresa: any) {
  this.usersService.ListraRoles(id_empresa).subscribe((resp: any) => {
    console.log("Respuesta completa del servidor Listar roles:", resp);
    
    this.roles = resp.roles;
    
    // 🔥 IMPORTANTE: Notificar a Angular que los datos llegaron
    this.cdr.detectChanges(); 

    console.log("Lista de Roles recibida:", this.roles);
  });
}

/*
listarSucursales(id_empresa: any) {
  this.usersService.ListarSucursales(id_empresa).subscribe((resp: any) => {
    console.log("Respuesta completa del servidor Listar Sucursales:", resp);
    
     this.sucursales = resp.sucursales;
    
    // 🔥 IMPORTANTE: Notificar a Angular que los datos llegaron
    this.cdr.detectChanges(); 

    console.log("Lista de Sucursales recibida:", this.roles);
  });
}
*/





  loadPage($event:any){
    this.listUsers($event);
  }



   configSecciones() {
   this.usersService.configSecciones().subscribe((resp: any) => {
    // El console.log te mostrará todo el objeto que viene de Laravel
    console.log("Respuesta completa del servidor:", resp);
   

   
  });
}

  createUser(){
    const modalRef = this.modalService.open(CreateUserComponent,{centered:true, size: 'xl'});
    modalRef.componentInstance.roles = this.roles;
    modalRef.componentInstance.sucursales = this.sucursales;
     modalRef.componentInstance.areas = this.areas;
     // ✅ ESTA LÍNEA FALTABA
    modalRef.componentInstance.secciones = this.secciones;

     modalRef.componentInstance.UserC.subscribe(() => {
        // 🔄 Recargar lista desde backend
        this.listUsers(this.currentPage);
      });
  }


  Permisos(USER:any){
    const modalRef = this.modalService.open(PermisosSeleccionComponent,{centered:true, size: 'xl'});
    modalRef.componentInstance.USER_SELECTED = USER;
   
   // modalRef.componentInstance.secciones = this.secciones;
    modalRef.componentInstance.permisos_documentales = USER.permisos_documentales;
    
     modalRef.componentInstance.UserE.subscribe(() => {
        this.listUsers(this.currentPage); // 🔄 recargar tabla
      });
  }



  editUser(USER:any){
    const modalRef = this.modalService.open(EditUserComponent,{centered:true, size: 'xl'});
    modalRef.componentInstance.USER_SELECTED = USER;
    modalRef.componentInstance.roles = this.roles;
    modalRef.componentInstance.sucursales = this.sucursales;
    modalRef.componentInstance.permissions = USER.permissions;
    modalRef.componentInstance.areas = this.areas;
     // ✅ ESTA LÍNEA FALTABA
   // modalRef.componentInstance.secciones = this.secciones;
    modalRef.componentInstance.permisos_documentales = USER.permisos_documentales;
    
     modalRef.componentInstance.UserE.subscribe(() => {
        this.listUsers(this.currentPage); // 🔄 recargar tabla
      });
  }

  deleteUser(USER:any){
    const modalRef = this.modalService.open(DeleteUserComponent,{centered:true, size: 'md'});
    modalRef.componentInstance.USER_SELECTED = USER;

    modalRef.componentInstance.UserD.subscribe((user:any) => {
      let INDEX = this.USERS.findIndex((user:any) => user.id == USER.id);
      if(INDEX != -1){
        this.USERS.splice(INDEX,1);
      }
    })
  }
  isPermission(permission:string){
    return isPermission(permission);
  }
}
