import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { CreateProyectoComponent } from '../create-proyecto/create-proyecto.component';
import { UpdateProyectoComponent } from '../update-proyecto/update-proyecto.component';
import { DeleteProyectoComponent } from '../delete-proyecto/delete-proyecto.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProyectoService } from '../service/proyecto.service';
import { Router } from '@angular/router';
import { CreateSubseccionComponent } from '../../subseccion/create-subseccion/create-subseccion.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-list-proyecto',
  templateUrl: './list-proyecto.component.html',
  styleUrls: ['./list-proyecto.component.scss']
})
export class ListProyectoComponent {
private idProyecto: number | null = null;
  search: string = '';
  PROYECTOS: any[] = [];
  isLoading$: any;

  totalPages: number = 0;
  currentPage: number = 1;

  @Input() proyecto: any;

  permisosDocumentales: any[] = [];           // Todos los permisos que vienen de la DB
  permisosPorSeccion: { [id_seccion: number]: any } = {}; // Mapa por sección para acceso rápido
  puedeCrearSeccion: boolean = false;  
  puedeEditarSeccion: boolean = false;          // Botón global editar
  puedeEliminarSeccion: boolean = false;        // Botón global eliminar

 

  constructor(
    public modalService: NgbModal,
    public proyectoService: ProyectoService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {

    const user = JSON.parse(localStorage.getItem('user') || '{}');

  console.log('ID USUARIO:', user.id);
  console.log('ROL:', user.role_name);

  // 🔥 ADMIN → TODO HABILITADO (SIN RETURN)
  if (this.isAdminUser(user)) {
  console.log('Usuario ADMIN → permisos completos');

  this.permisosDocumentales = [];
  this.permisosPorSeccion = {};

  this.puedeCrearSeccion = true;
  this.puedeEditarSeccion = true;
  this.puedeEliminarSeccion = true;

  this.cd.detectChanges(); // 🔥 ESTA LÍNEA ES LA CLAVE
}

  // 👇 USUARIO NORMAL
  else if (user?.id) {
    this.PermisosUsuario(user.id);
  }
    this.isLoading$ = this.proyectoService.isLoading$;
    this.listProyectos();
    console.log("Proyecto recibido:", this.proyecto);
  }

  listProyectos(page = 1) {
    // 🚀 Lanzar SweetAlert de carga
    Swal.fire({
      title: 'Cargando listado Secciones...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  
    this.proyectoService.listProyectos(page, this.search).subscribe({
      next: (resp: any) => {
        this.PROYECTOS = resp.proyectos;
        this.totalPages = resp.total;
        this.currentPage = page;
  
        // 🏁 Cerrar SweetAlert
        Swal.close();
        
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error("Error al cargar proyectos", err);
        Swal.close();
        Swal.fire('Error', 'No se pudo cargar el listado', 'error');
      }
    });
  } 

  PermisosUsuario(idUser: number) {
  console.log('Ejecutando PermisosUsuario con ID:', idUser);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  this.proyectoService.permisosUsuario(idUser.toString()).subscribe({
    next: (resp: any) => {
      console.log('Permisos del usuario recibidos de la API:', resp);

      // 1️⃣ Guardar todos los permisos completos
      this.permisosDocumentales = resp.permissions || [];

      // 2️⃣ Crear un mapa por id_seccion
      this.permisosPorSeccion = this.permisosDocumentales.reduce((acc, permiso) => {
        if (permiso.id_seccion !== null) {
          acc[permiso.id_seccion] = permiso; // Guardamos todo el objeto
        }
        return acc;
      }, {} as { [id_seccion: number]: any });

      console.log('Permisos por sección:', this.permisosPorSeccion);

      // 3️⃣ Evaluar permisos globales
      this.puedeCrearSeccion = this.permisosDocumentales.some(p =>
        p.id_seccion !== null &&
        p.crear === true &&
        p.id_empresa === user.id_empresa
      );

      this.puedeEditarSeccion = this.permisosDocumentales.some(p =>
        p.id_seccion !== null &&
        p.editar === true &&
        p.id_empresa === user.id_empresa
      );

      this.puedeEliminarSeccion = this.permisosDocumentales.some(p =>
        p.id_seccion !== null &&
        p.eliminar === true &&
        p.id_empresa === user.id_empresa
      );

      console.log('¿Puede crear?', this.puedeCrearSeccion);
      console.log('¿Puede editar?', this.puedeEditarSeccion);
      console.log('¿Puede eliminar?', this.puedeEliminarSeccion);
    },
    error: (err) => {
      console.error('Error permisos usuario', err);
      this.permisosDocumentales = [];
      this.permisosPorSeccion = {};
      this.puedeCrearSeccion = false;
      this.puedeEditarSeccion = false;
      this.puedeEliminarSeccion = false;
    }
  });
}

isAdminUser(user: any): boolean {
  return (
    user?.role_name?.toLowerCase().includes('admin') ||
    user?.permissions?.includes('super_admin')
  );
}



  loadPage($event: any) {
    this.listProyectos($event);
  }

  createProyecto() {
    const modalRef = this.modalService.open(CreateProyectoComponent, { centered: true, size: 'lg' });

    modalRef.componentInstance.ProyectoC.subscribe((proyecto: any) => {
      this.PROYECTOS.unshift(proyecto);
    });
  }

  editProyecto(PROYECTO: any) {
   
  const modalRef = this.modalService.open(UpdateProyectoComponent, { centered: true, size: 'lg' });
  modalRef.componentInstance.PROYECTO_SELECTED = PROYECTO;

  modalRef.componentInstance.ProyectoE.subscribe((proyectoActualizado: any) => {
    const INDEX = this.PROYECTOS.findIndex((p: any) => p.id === proyectoActualizado.id);
   if (INDEX !== -1) {
      proyectoActualizado.estado = Number(proyectoActualizado.estado);

      this.PROYECTOS[INDEX] = proyectoActualizado;
      this.PROYECTOS = [...this.PROYECTOS];

      this.cd.detectChanges();
    }
  });
}


  deleteProyecto(PROYECTO: any) {
    const modalRef = this.modalService.open(DeleteProyectoComponent, { centered: true, size: 'md' });
    modalRef.componentInstance.PROYECTO_SELECTED = PROYECTO;

    modalRef.componentInstance.ProyectoD.subscribe(() => {
      const INDEX = this.PROYECTOS.findIndex((p: any) => p.id == PROYECTO.id);
      if (INDEX != -1) {
        this.PROYECTOS.splice(INDEX, 1);
      }
    });
  }



 
  verModuloProyecto(id_proyecto: number) {
    this.router.navigate(['/modulos/list'], { queryParams: { id_proyecto } });
  }




createSubSeccion(id_proyecto: number) {
  this.router.navigate(['/subseccion/list'], {
    queryParams: { idProyecto: id_proyecto }
  });
}




}
