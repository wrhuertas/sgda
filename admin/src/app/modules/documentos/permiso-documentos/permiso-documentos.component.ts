import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';
import { DocumentosService } from '../service/docuemntos.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-permiso-documentos',
  templateUrl: './permiso-documentos.component.html',
  styleUrls: ['./permiso-documentos.component.scss']
})
export class PermisoDocumentosComponent implements OnInit {
  user: any;
  id_empresa!: number;

  @Input() id!: number;       // ID del proyecto/serie/subsección
  @Input() tipo!: string;     // Tipo del elemento

  usuarios: any[] = [];
   loggedUser: any; 

  constructor(
    private authService: AuthService,
    private documentosService: DocumentosService,
    public activeModal: NgbActiveModal, // 🔹 Inyección correcta para controlar el modal
    public toast: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    this.user = this.authService.user;
    this.id_empresa = this.user.id_empresa;

    console.log('ID elemento:', this.id);
    console.log('Tipo:', this.tipo);
    console.log('ID empresa:', this.id_empresa);

    this.enviarIdEmpresa();
    this.getPermisos();
  }

  // Obtener usuarios de la empresa
  enviarIdEmpresa(): void {
    this.documentosService.getUsuariosByEmpresa(this.id_empresa)
      .subscribe({
        next: (res) => {
          console.log('Usuarios de la empresa:', res);
          this.usuarios = res.map(u => ({ ...u, puede_ver: false })); // inicializamos permisos en false
           this.getPermisos();
        },
        error: (err) => console.error('Error al enviar ID empresa:', err)
      });
  }




getPermisos(): void {
  if (!this.id_empresa) {
    this.toast.error('Validación', 'No se encontró el ID de la empresa.');
    return;
  }

  if (!this.id) {
    this.toast.error('Validación', 'No se encontró el ID de la carpeta/proyecto.');
    return;
  }

  // Recorremos los usuarios y enviamos los 3 campos necesarios al backend
  this.usuarios.forEach(usuario => {
    if (!usuario.id) return;

    const payload = {
      id_carpeta: this.id.toString(),   // convertimos a string
      id_empresa: this.id_empresa.toString(), // convertimos a string
      id_usuario: usuario.id.toString() // aseguramos que sea string
    };

    // Llamada al backend para traer permisos de este usuario específico
    this.documentosService.getPermisosPorCarpeta(payload).subscribe({
      next: (permisosRes: any) => {
        // Inicializamos los permisos del usuario con los datos recibidos
        usuario.puede_ver = permisosRes.puede_ver === 1;
        usuario.puede_subir = permisosRes.puede_subir === 1;
        usuario.puede_editar = permisosRes.puede_editar === 1;
        usuario.puede_eliminar = permisosRes.puede_eliminar === 1;
      },
      error: (err) => {
        console.error(`Error al traer permisos del usuario ${usuario.id}:`, err);
      }
    });
  });
}

  // Función para guardar permisos (aún puedes definir la llamada al backend)
 guardarPermisos() {
  // Validar que tengamos ID de empresa
  if (!this.id_empresa) {
    this.toast.error('Validación', 'No se encontró el ID de la empresa.');
    return;
  }

  // Validar que tengamos ID del proyecto/serie/subsección
  if (!this.id) {
    this.toast.error('Validación', 'No se encontró el ID de la carpeta/proyecto.');
    return;
  }

   // Validar que tengamos ID del usuario logeado
  if (!this.loggedUser || !this.loggedUser.id) {
    this.toast.error('Validación', 'No se encontró el usuario logeado.');
    return;
  }

  // Preparar el payload
  const payload = {
    id_carpeta: this.id,
    id_usuario_logeado: this.loggedUser.id,  // <-- agregamos el usuario logeado
    usuarios: this.usuarios.map(u => ({
      id_usuario: u.id,
      puede_ver: u.puede_ver ? 1 : 0,
      puede_subir: u.puede_subir ? 1 : 0,
      puede_editar: u.puede_editar ? 1 : 0,
      puede_eliminar: u.puede_eliminar ? 1 : 0
    }))
  };

  // Llamada al backend
  this.documentosService.guardarPermisosCarpetas(payload).subscribe({
    next: (resp: any) => {
      this.toast.success('Éxito', 'Permisos guardados correctamente.');
      this.activeModal.close(true);
    },
    error: (err) => {
      console.error(err);
      this.toast.error('Error', 'No se pudieron guardar los permisos.');
    }
  });
}


}
