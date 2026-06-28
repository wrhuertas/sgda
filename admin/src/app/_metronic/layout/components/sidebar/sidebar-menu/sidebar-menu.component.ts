import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/modules/auth';

@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss']
})
export class SidebarMenuComponent implements OnInit {
  id_empresa: number | null = null; // <-- nueva propiedad
  role_usuario: string | null = null;
  user:any;
  userOriginal: any; // Super Admin original
  constructor(
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    this.user = this.authService.user;
    this.userOriginal = this.authService.user; // Guardar Super Admin original
    
    // 🔄 Suscribirse a cambios del usuario actual
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.user = user;
        console.log('Usuario actualizado en sidebar:', this.user.role_name);
      }
    });
    
    // Si es super admin, mostramos su id
    this.authService.id_usuario$.subscribe(role => {
      this.role_usuario = role;
      console.log('Role del usuario actualizado en sidebar:', this.role_usuario);
    });
    
    this.authService.id_empresa$.subscribe(id => {
      this.id_empresa = id;
      console.log('ID de la empresa actualizado en sidebar:', this.id_empresa);
    });
  }
  // ['register_role','edit_role'].includes('delete_role') 
  showMenu(permisos:any = []){
    // 🔐 Si el usuario actual es Admin (pero el original es Super Admin), mostrar todo
    if (this.isAdminConSuperAdminOriginal()) {
      return true;
    }
    
    // Si es Super Admin, solo mostrar Empresas
    if(this.isRole()){
      return false; // No mostrar ningún otro menú
    }
    
    let permissions = this.user.permissions;
    var is_show = false;
    permisos.forEach((permiso:any) => {
      if(permissions.includes(permiso)){
        is_show = true;
      }
    });
    return is_show;
  }

  isRole(){
    // Super Admin puro (sin cambiar a empresa)
    return this.user?.role_name == 'Super-Admin' ? true : false;
  }

  // 🔍 Verificar si se está mostrando como Admin pero es Super Admin
  isAdminConSuperAdminOriginal(): boolean {
    return (this.userOriginal?.id === 1 || this.userOriginal?.role_name === 'Super-Admin') && 
           this.user?.role_name !== 'Super-Admin';
  }
}
