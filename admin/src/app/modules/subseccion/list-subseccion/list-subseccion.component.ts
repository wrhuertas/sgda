import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SubseccionService } from '../service/subseccion.service';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateSubseccionComponent } from '../create-subseccion/create-subseccion.component';
import { EditSubseccionComponent } from '../edit-subseccion/edit-subseccion.component';
import { DeleteSubseccionComponent } from '../delete-subseccion/delete-subseccion.component';
import Swal from 'sweetalert2';

interface SubSeccion {
  id_proyecto: number;
  nombre: string;
  estado: number;
  created_at: string;
  // agrega más propiedades si las usas
}

@Component({
  selector: 'app-list-subseccion',
  templateUrl: './list-subseccion.component.html',
  styleUrls: ['./list-subseccion.component.scss']
})
export class ListSubseccionComponent implements OnInit {
  idProyecto!: number;
  nombreProyecto!: string;
  search: string = '';
  SUBSECCIONES: any[] = [];
  totalPages: number = 0;
  currentPage: number = 1;
 isLoading$: any;

permisosPorSeccion: { [id_seccion: number]: any } = {}; 

 // Todos los permisos que vienen de la DB
permisosDocumentales: any[] = [];

permisosPorSubSeccion: { [id_subseccion: number]: any } = {};

esAdmin: boolean = false;

puedeCrearSubSeccion: boolean = false;
puedeEditarSubSeccion: boolean = false;
puedeEliminarSubSeccion: boolean = false;
isDataLoaded: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private subseccionService: SubseccionService,
    private cdr: ChangeDetectorRef,
     public modalService: NgbModal,
     private router: Router
  ) {console.log('ListSubseccionComponent ESTA EN EL COMPONTENT Q NO ES ');}


  goBack(): void {
    window.history.back();
  }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.esAdmin = this.isAdminUser(user);
  
    console.log('ID USUARIO:', user.id);
    console.log('ROL:', user.role_name);
  
    // 🔥 CONFIGURACIÓN INICIAL DE PERMISOS
    if (this.esAdmin) {
      console.log('Usuario ADMIN → permisos completos (SubSección)');
      this.permisosDocumentales = [];
      this.permisosPorSubSeccion = {};
      this.puedeCrearSubSeccion = true;
      this.puedeEditarSubSeccion = true;
      this.puedeEliminarSubSeccion = true;
      this.cdr.detectChanges();
    } 
  
    // 1. PRIMERO: Obtenemos los parámetros de la ruta
    this.route.queryParams.subscribe(params => {
      this.idProyecto = params['idProyecto'];
      console.log('Proyecto recibido:', this.idProyecto);
  
      if (this.idProyecto) {
        // 2. SEGUNDO: Traemos el nombre del proyecto (Independiente)
        this.subseccionService.getProyectoById(this.idProyecto).subscribe(
          (data: any) => {
            console.log('Nombre del proyecto:', data.nombre);
            this.nombreProyecto = data.nombre;
            this.cdr.detectChanges();
          },
          (error) => console.error('Error al traer el proyecto:', error)
        );
  
        // 3. TERCERO: Lógica de carga con ORDEN DE PRIORIDAD
        if (this.esAdmin) {
          // Si es admin, carga directo porque no necesita mapa de permisos
          this.loadSubsecciones();
        } else if (user?.id) {
          // ⚠️ SI ES USUARIO NORMAL: 
          // Primero cargamos permisos. NO llamamos a loadSubsecciones aquí.
          // La llamada a loadSubsecciones() debe ir DENTRO del success de PermisosSubSeccion.
          this.PermisosSubSeccion(user.id);
        }
      }
    });
  }

  
    

  loadSubsecciones(page: number = 1) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
  
    // 1. 🚀 BLOQUEO INMEDIATO
    this.isDataLoaded = false; // Esto oculta el contenido en el HTML de una vez
    this.SUBSECCIONES = []; 
    this.cdr.detectChanges(); // Forzamos a Angular a ocultar la tabla AHORA
  
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
  
    this.subseccionService
      .listSubsecciones(this.idProyecto, page, this.search)
      .subscribe({
        next: (res: any) => {
          this.totalPages = res.total;
          this.currentPage = page;
  
          // 🔥 FILTRADO SEGÚN ROL
          if (this.isAdminUser(user)) {
            this.SUBSECCIONES = res.data;
          } else {
            this.SUBSECCIONES = res.data.filter((sub: any) => {
              const permiso = this.permisosPorSubSeccion[sub.id_proyecto];
              return permiso?.ver === true || permiso?.ver === 1;
            });
          }
  
          // 3. ✅ PROCESO TERMINADO
          this.isDataLoaded = true; // Ahora el HTML tiene permiso de mostrarse
          Swal.close(); // Cerramos el aviso
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error cargando subsecciones:', err);
          this.isDataLoaded = true; 
          Swal.close();
          Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
          this.cdr.detectChanges();
        }
      });
  }



    isAdminUser(user: any): boolean {
      return (
        user?.role_name?.toLowerCase().includes('admin') ||
        user?.permissions?.includes('super_admin')
      );
    }


    createSubSeccion(idProyecto: number) {
      console.log('ID del proyecto recibido en el modal:', idProyecto);

      const modalRef = this.modalService.open(CreateSubseccionComponent, {
        centered: true,
        size: 'lg'
      });

      modalRef.componentInstance.idProyecto = idProyecto;

      modalRef.componentInstance.SubseccionC.subscribe((subseccion: any) => {
        console.log('Subsección creada:', subseccion);
        this.loadSubsecciones(this.currentPage); // refresca la lista si quieres
      });
    }




  
    editSubseccion(sub: any) {
      const modalRef = this.modalService.open(EditSubseccionComponent, {
        centered: true,
        size: 'lg',
        backdrop: 'static'
      });
    
      modalRef.componentInstance.SUBSECCIONES_SELECTED = sub;
    
      modalRef.componentInstance.ProyectoE.subscribe(() => {
        // 🔄 RECARGAR LISTA COMPLETA
        this.loadSubsecciones(this.currentPage);
      });
    }
    
    
    

  
  

    deleteSubseccion(sub: any) {
      const modalRef = this.modalService.open(DeleteSubseccionComponent, {
        centered: true,
        size: 'md',
        backdrop: 'static'
      });
    
      // Enviar la subsección
      modalRef.componentInstance.SUBSECCION_SELECTED = sub;
    
      // Escuchar cuando se "elimine" y refrescar la lista
      modalRef.componentInstance.subseccionEliminada.subscribe(() => {
        this.loadSubsecciones(this.currentPage); // recargar lista
      });
    }
    
    



    
    

    verDocumentacion(sub: any) {
      const idProyecto = sub.id_proyecto;
      console.log('Navegando a Proyecto con ID:', idProyecto);

      this.router.navigate(['/indexacion/list'], { queryParams: { idProyecto } }) // 👈 ahora coincide
        .then(success => console.log('Navegación exitosa:', success))
        .catch(err => console.error('Error en navegación:', err));
    }


   

    create(sub: any) {
      const idSubseccion = sub.id_proyecto;
      console.log('Navegando a SubSeccion1 con ID:', idSubseccion);

      this.router.navigate(['/subseccion1/list'], { queryParams: { idSubseccion } })
        .then(success => console.log('Navegación exitosa:', success))
        .catch(err => console.error('Error en navegación:', err));
    }


    crearSerie(sub: any) {
      const idSubseccion = sub.id_proyecto;  // 👈 aquí tomas el ID de la fila clicada
      console.log('ID de la fila seleccionada:', idSubseccion);

      this.router.navigate(['/serie/list'], { queryParams: { idSubseccion } })
        .then(success => console.log('Navegación exitosa:', success))
        .catch(err => console.error('Error en navegación:', err));
    }




    PermisosSubSeccion(idUser: number) {
      console.log('Ejecutando PermisosSubSeccion con ID:', idUser);
    
      const user = JSON.parse(localStorage.getItem('user') || '{}');
    
      this.subseccionService.permisosUsuario(idUser.toString()).subscribe({
        next: (resp: any) => {
          console.log('Permisos del usuario para Sub Sección recibidos:', resp);
    
          // 1. Guardar todos los permisos completos
          this.permisosDocumentales = resp.permissions || [];
    
          // 2. Crear mapa por id_subseccion
          this.permisosPorSubSeccion = this.permisosDocumentales.reduce((acc, permiso) => {
            if (permiso.id_subseccion !== null) {
              acc[permiso.id_subseccion] = permiso; // Guardamos todo el objeto
            }
            return acc;
          }, {} as { [id_subseccion: number]: any });
    
          console.log('Permisos por Sub Sección cargados:', this.permisosPorSubSeccion);
    
          // 3. Evaluar permisos globales para Sub Sección
          this.puedeCrearSubSeccion = this.permisosDocumentales.some(p =>
            p.id_subseccion !== null &&
            p.crear === true &&
            p.id_empresa === user.id_empresa
          );
    
          this.puedeEditarSubSeccion = this.permisosDocumentales.some(p =>
            p.id_subseccion !== null &&
            p.editar === true &&
            p.id_empresa === user.id_empresa
          );
    
          this.puedeEliminarSubSeccion = this.permisosDocumentales.some(p =>
            p.id_subseccion !== null &&
            p.eliminar === true &&
            p.id_empresa === user.id_empresa
          );
    
          console.log('¿Puede crear Sub Sección?', this.puedeCrearSubSeccion);
          console.log('¿Puede editar Sub Sección?', this.puedeEditarSubSeccion);
          console.log('¿Puede eliminar Sub Sección?', this.puedeEliminarSubSeccion);
    
          // 🔥 ESTO ES LO QUE ARREGLA EL PROBLEMA INTERMITENTE:
          // Llamamos a cargar las subsecciones justo ahora que el mapa ya tiene datos.
          this.loadSubsecciones();
          
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error permisos Sub Sección', err);
          this.permisosDocumentales = [];
          this.permisosPorSubSeccion = {};
          this.puedeCrearSubSeccion = false;
          this.puedeEditarSubSeccion = false;
          this.puedeEliminarSubSeccion = false;
          
          // Si falla la carga de permisos, igual cargamos las subsecciones 
          // para que el filtro devuelva vacío y se muestre el mensaje "Sin información"
          this.loadSubsecciones();
        }
      });
    }



}

