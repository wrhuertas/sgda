import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateSubseccionComponent } from '../../subseccion/create-subseccion/create-subseccion.component';
import { Subseccion1Service } from '../service/subseccion1.service';
import { ChangeDetectorRef, Component } from '@angular/core';
import { from } from 'rxjs';
import { CreateSubseccion1Component } from '../create-subseccion1/create-subseccion1.component';
import { EditSubseccion1Component } from '../edit-subseccion1/edit-subseccion1.component';
import { DeleteSubseccion1Component } from '../delete-subseccion1/delete-subseccion1.component';
import Swal from 'sweetalert2';

interface SubSubSeccion {
  id_proyecto: number;
  nombre: string;
  estado: number;
  created_at: string;
  updated_at: string;
  subsubsecciones?: SubSubSeccion[]; // si hay más niveles
}

@Component({
  selector: 'app-list-subseccion1',
  templateUrl: './list-subseccion1.component.html',
  styleUrls: ['./list-subseccion1.component.scss'],
})
export class ListSubseccion1Component {
  idSubseccion!: number;
  nombreProyecto!: string;
  search: string = '';
  SUBSECCIONES: any[] = [];
  totalPages: number = 0;
  currentPage: number = 1;
  isLoading$: any;
proyectoCompleto: any;

  nombreSubseccion!: string;
nombreProyectoPadre: string = '';

esAdmin: boolean = false;

permisosDocumentales: any[] = [];
// Todos los permisos que vienen de la DB para Sub-Sub Sección
permisosPorSubSubSeccion: { [id_subsubseccion: number]: any } = {};

puedeCrearSubSubSeccion: boolean = false;
puedeEditarSubSubSeccion: boolean = false;
puedeEliminarSubSubSeccion: boolean = false;

isDataLoaded: boolean = false;




  constructor(
    private route: ActivatedRoute,
    private subseccion1Service: Subseccion1Service,
    private cdr: ChangeDetectorRef,
    public modalService: NgbModal,
    private router: Router
  ) {}


  goBack(): void {
    window.history.back();
  }
  

  ngOnInit(): void {


    const user = JSON.parse(localStorage.getItem('user') || '{}');

    console.log('ID USUARIO:', user.id);
    console.log('ROL:', user.role_name);

      // 🔥 AQUÍ SE DEFINE UNA SOLA VEZ
    this.esAdmin = this.isAdminUser(user);

    // 🔥 ADMIN → permisos completos
    if (this.isAdminUser(user)) {
      console.log('Usuario ADMIN → permisos completos (SubSubSección)');

      this.puedeCrearSubSubSeccion = true;
      this.puedeEditarSubSubSeccion = true;
      this.puedeEliminarSubSubSeccion = true;

      this.cdr.detectChanges(); // 👈 OBLIGATORIO
    }
    // 👇 USUARIO NORMAL
    else if (user?.id) {
      this.PermisosSubSubSeccion(user.id);
    }




    if (this.nombreSubseccion) {
      console.log(
        'Nombre SubSección recibido en el modal:',
        this.nombreSubseccion
      );
    }

    this.route.queryParams.subscribe((params) => {
      this.idSubseccion = Number(params['idSubseccion']); // convierte a número
      console.log('📥 Sub Seccion recibido:', this.idSubseccion);

      if (this.idSubseccion) {
        this.loadSubsecciones1();

        this.subseccion1Service.getSubSeccionById(this.idSubseccion).subscribe(
          (data: any) => {
            console.log('📦 Datos completos del proyecto padre:', data);

            this.proyectoCompleto = data;

            // ✅ NOMBRE DEL HIJO (subsección actual)
            this.nombreSubseccion = data.nombre;

            // ✅ NOMBRE DEL PADRE
            this.nombreProyectoPadre = data.padre?.nombre || '';

            this.cdr.detectChanges();
          },
          (error) => {
            console.error('❌ Error al traer el proyecto:', error);
          }
        );

      }
    });
  }


  isAdminUser(user: any): boolean {
    return (
      user?.role_name?.toLowerCase().includes('admin') ||
      user?.permissions?.includes('super_admin')
    );
  }


  loadSubsecciones1(page: number = 1) {
    // 1. 🚀 BLOQUEO VISUAL INMEDIATO
    this.isDataLoaded = false;
    this.SUBSECCIONES = [];
    this.cdr.detectChanges();
  
    // 2. LANZAR EL SWAL
    Swal.fire({
      title: 'Cargando subsecciones...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  
    const user = JSON.parse(localStorage.getItem('user') || '{}');
  
    this.subseccion1Service
      .listSubsecciones1(this.idSubseccion, page, this.search)
      .subscribe({
        next: (res: any) => {
          const subs = res.data || [];
  
          if (this.esAdmin) {
            this.SUBSECCIONES = subs;
          } else {
            // Filtrado por permisos
            this.SUBSECCIONES = subs.filter((sub: any) => {
              const permiso = this.permisosPorSubSubSeccion[sub.id_proyecto];
              return permiso?.ver === true || permiso?.ver === 1;
            });
          }
  
          this.totalPages = res.total || this.SUBSECCIONES.length;
          this.currentPage = page;
  
          // 🏁 FINALIZAR CARGA
          this.isDataLoaded = true;
          Swal.close();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error cargando:', err);
          this.isDataLoaded = true;
          Swal.close();
          Swal.fire('Error', 'Error al conectar con el servidor', 'error');
          this.cdr.detectChanges();
        }
      });
  }
  


  // Función para aplanar recursivamente
  flattenSubsecciones(subs: any[]): any[] {
    let result: any[] = [];
    if (!subs || subs.length === 0) return result;

    subs.forEach((sub) => {
      result.push(sub);
      if (sub.subsecciones && sub.subsecciones.length > 0) {
        result = result.concat(this.flattenSubsecciones(sub.subsecciones));
      }
    });

    return result;
  }

  // ✅ Abrir modal de Crear SubSeccion1
createSubSeccion1() {
  // 1. CORRECCIÓN EN LA VALIDACIÓN: Usar this.nombreSubseccion que sí tiene el nombre.
  if (!this.idSubseccion || !this.nombreSubseccion || !this.proyectoCompleto) {
      console.error('ERROR: Datos del padre incompletos para abrir el modal.');
      // Opcional: Usar toastr si está inyectado: this.toastr.error('Datos incompletos.');
      return; 
  }

  // 2. Corregir los console.log para reflejar el nombre correcto
  console.log('ID:', this.idSubseccion);
  console.log('Nombre Padre (Subseccion):', this.nombreSubseccion); // Usar nombreSubseccion
  console.log('📦 Objeto completo enviado al modal:', this.proyectoCompleto);

  const modalRef = this.modalService.open(CreateSubseccion1Component, {
    centered: true,
    size: 'lg',
  });
  
  // 3. Pasar el nombre correcto al modal
  modalRef.componentInstance.padreId = this.proyectoCompleto.padre_id;
  modalRef.componentInstance.idSubseccion = this.idSubseccion;
  modalRef.componentInstance.nombreSubseccion = this.nombreSubseccion; // 👈 CORREGIDO

  // 👇 MANDAMOS TODO EL OBJETO COMPLETO
  modalRef.componentInstance.proyectoCompleto = this.proyectoCompleto;

  modalRef.componentInstance.SubseccionC?.subscribe(() => {
    this.loadSubsecciones1(this.currentPage);
  });
}


editSubseccion1(sub: any) {
  const modalRef = this.modalService.open(EditSubseccion1Component, {
    centered: true,
    size: 'lg',
    backdrop: 'static'
  });

  // Enviar el objeto completo
  modalRef.componentInstance.SUBSECCION1_SELECTED = sub;

  // Escuchar cuando se actualice la sub-sub-sección
  modalRef.componentInstance.subseccionActualizada.subscribe((actualizado: any) => {
    console.log('Sub-Sub-Sección actualizada:', actualizado);

    // 1️⃣ Intentamos reemplazar solo el objeto en el arreglo
    const index = this.SUBSECCIONES.findIndex(
      (s: any) => s.id_proyecto === actualizado.id_proyecto
    );

    if (index !== -1) {
      this.SUBSECCIONES[index] = actualizado;
      this.cdr.detectChanges(); // forzar refresco de la vista
      console.log('Arreglo actualizado localmente:', this.SUBSECCIONES);
      return;
    }

    // 2️⃣ Si no se encuentra, recargar toda la lista desde la API
    console.log('No se encontró la sub-sub-sección en la lista, recargando desde la API...');
    this.loadSubsecciones1(this.currentPage);
  });
}



deleteSubseccion1(SUB: any) {
  const modalRef = this.modalService.open(DeleteSubseccion1Component, {
    centered: true,
    size: 'md',       // tamaño mediano
    backdrop: 'static'
  });

  // Pasar la sub-sub-sección completa al modal
  modalRef.componentInstance.SUBSECCION1_SELECTED = SUB;

  // Escuchar cuando el modal confirme la eliminación
  modalRef.componentInstance.subseccionEliminada.subscribe(() => {
    console.log('Sub-sub-sección eliminada, recargando lista...');
    this.loadSubsecciones1(this.currentPage); // recargar la lista desde la API
  });
}


   verDocumentacion(sub: any) {
      const idProyecto = sub.id_proyecto;
      console.log('Navegando a Proyecto con ID:', idProyecto);

      this.router.navigate(['/indexacion/list'], { queryParams: { idProyecto } }) // 👈 ahora coincide
        .then(success => console.log('Navegación exitosa:', success))
        .catch(err => console.error('Error en navegación:', err));
    }

  crearSerie(sub: any) {
    const idSubseccion = sub.id_proyecto; // 👈 aquí tomas el ID de la fila clicada
    console.log('ID de la fila seleccionada:', idSubseccion);

    this.router
      .navigate(['/serie/list'], { queryParams: { idSubseccion } })
      .then((success) => console.log('Navegación exitosa:', success))
      .catch((err) => console.error('Error en navegación:', err));
  }

  createSunSunseccion3(id_subseccion1: number) {
    this.router.navigate(['/subseccion2/list'], {
      queryParams: { idSubseccion: id_subseccion1 },
    });
  }


  

  PermisosSubSubSeccion(idUser: number) {
  console.log('Ejecutando PermisosSubSubSeccion con ID:', idUser);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  this.subseccion1Service.permisosUsuario(idUser.toString()).subscribe({
    next: (resp: any) => {
      console.log('Permisos del usuario para Sub-Sub Sección recibidos:', resp);

      // Guardar todos los permisos completos
      this.permisosDocumentales = resp.permissions || [];

      // Crear mapa por id_subsubseccion
      this.permisosPorSubSubSeccion = this.permisosDocumentales.reduce((acc, permiso) => {
        if (permiso.id_subsubseccion !== null) {
          acc[permiso.id_subsubseccion] = permiso; // Guardamos todo el objeto
        }
        return acc;
      }, {} as { [id_subsubseccion: number]: any });

      console.log('Permisos por Sub-Sub Sección:', this.permisosPorSubSubSeccion);

      // Evaluar permisos globales para Sub-Sub Sección
      this.puedeCrearSubSubSeccion = this.permisosDocumentales.some(p =>
        p.id_subsubseccion !== null &&
        p.crear === true &&
        p.id_empresa === user.id_empresa
      );

      this.puedeEditarSubSubSeccion = this.permisosDocumentales.some(p =>
        p.id_subsubseccion !== null &&
        p.editar === true &&
        p.id_empresa === user.id_empresa
      );

      this.puedeEliminarSubSubSeccion = this.permisosDocumentales.some(p =>
        p.id_subsubseccion !== null &&
        p.eliminar === true &&
        p.id_empresa === user.id_empresa
      );

      console.log('¿Puede crear Sub-Sub Sección?', this.puedeCrearSubSubSeccion);
      console.log('¿Puede editar Sub-Sub Sección?', this.puedeEditarSubSubSeccion);
      console.log('¿Puede eliminar Sub-Sub Sección?', this.puedeEliminarSubSubSeccion);
    },
    error: (err) => {
      console.error('Error permisos Sub-Sub Sección', err);
      this.permisosDocumentales = [];
      this.permisosPorSubSubSeccion = {};
      this.puedeCrearSubSubSeccion = false;
      this.puedeEditarSubSubSeccion = false;
      this.puedeEliminarSubSubSeccion = false;
    }
  });
}





}
