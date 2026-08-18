import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateSubseccionComponent } from '../../subseccion/create-subseccion/create-subseccion.component';
import { SerieService } from '../service/serie.service';
import { CreateSerieComponent } from '../create-serie/create-serie.component';
import { AuthService } from '../../auth';
import { EditSerieComponent } from '../edit-serie/edit-serie.component';
import Swal from 'sweetalert2';
import { DeleteSerieComponent } from '../delete-serie/delete-serie.component';


@Component({
  selector: 'app-list-serie',
  templateUrl: './list-serie.component.html',
  styleUrls: ['./list-serie.component.scss'],
})
export class ListSerieComponent {
  idSubseccion!: number;
  nombreSubSeccion!: string;
  search: string = '';
  SUBSECCIONES: any[] = [];
  // Lista tal como llegó del servidor, antes de filtrar por permisos.
  // Se conserva porque los permisos pueden llegar después que la lista.
  seriesSinFiltrar: any[] = [];
  totalSinFiltrar = 0;
  totalPages: number = 0;
  currentPage: number = 1;
  pageSize: number = 25;
  isLoading$: any;
  usuario_id!: number;
  jerarquia: any[] = [];

  esAdmin: boolean = false;

permisosDocumentales: any[] = [];

permisosPorSerie: { [id_serie: number]: any } = {};

puedeCrearSerie: boolean = false;
puedeEditarSerie: boolean = false;
puedeEliminarSerie: boolean = false;
  

isDataLoaded: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private serieService: SerieService,
    private cdr: ChangeDetectorRef,
    public modalService: NgbModal,
    private router: Router,
    private auth: AuthService
  ) {
    console.log('ListSubseccionComponent ESTA EN EL COMPONTENT Q NO ES ');
  }

  goBack(): void {
    window.history.back();
  }

  ngOnInit(): void {


    const userlogeado = JSON.parse(localStorage.getItem('user') || '{}');

    console.log('ID USUARIO:', userlogeado.id);
    console.log('ROL:', userlogeado.role_name);

    this.esAdmin = this.isAdminUser(userlogeado);

    // 🔥 ADMIN → permisos completos
    if (this.isAdminUser(userlogeado)) {
      console.log('Usuario ADMIN → permisos completos (Serie)');

      this.puedeCrearSerie = true;
      this.puedeEditarSerie = true;
      this.puedeEliminarSerie = true;

      this.cdr.detectChanges(); // 👈 OBLIGATORIO
    }
    // 👇 USUARIO NORMAL
    else if (userlogeado?.id) {
      this.PermisosSerie(userlogeado.id);
    }

    this.route.queryParams.subscribe((params) => {
      this.idSubseccion = params['idSubseccion']; // 👈 ahora coincide
      console.log('Serie compoentede des pues de seleccion Subsección recibida:', this.idSubseccion);

      if (this.idSubseccion) {
        this.loadSubsecciones();

         this.route.queryParams.subscribe((params) => {
            this.idSubseccion = Number(params['idSubseccion']);

            if (this.idSubseccion) {
              this.serieService.getSubSeccionById(this.idSubseccion).subscribe(
                (data: any) => {

                  console.log('📦 DATOS COMPLETOS:', data);

                  // ⬇️ AQUÍ ASIGNAMOS
                  this.jerarquia = data.jerarquia; 
                  this.nombreSubSeccion = data.proyecto_actual.nombre;

                  this.cdr.detectChanges();
                },
                (error) => {
                  console.error('Error al traer el proyecto:', error);
                }
              );
            }
          });

      }
    });

    const user = this.auth.currentUserSubject.getValue();
    if (user && user.id) {
      this.usuario_id = user.id; // 👈 solo el ID del usuario
      console.log('Usuario logeado:', this.usuario_id);
    }

    
  }


  isAdminUser(user: any): boolean {
    return (
      user?.role_name?.toLowerCase().includes('admin') ||
      user?.permissions?.includes('super_admin')
    );
  }

  /**
   * Deja en pantalla solo las series que el usuario puede ver.
   *
   * Se llama tanto cuando llega la lista como cuando llegan los permisos,
   * porque son dos peticiones independientes y no hay forma de saber cuál
   * responde primero. Antes, si los permisos llegaban después, la lista se
   * filtraba contra un mapa vacío y salía "Sin registros disponibles".
   */
  aplicarFiltroPermisos() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (this.isAdminUser(user)) {
      this.SUBSECCIONES = this.seriesSinFiltrar;
    } else {
      this.SUBSECCIONES = this.seriesSinFiltrar.filter((serie: any) => {
        const permiso = this.permisosPorSerie[serie.id_serie];
        return permiso?.ver === true || permiso?.ver === 1;
      });
    }

    this.totalPages = this.totalSinFiltrar || this.SUBSECCIONES.length;
    this.cdr.detectChanges();
  }


  loadSubsecciones(page: number = 1) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
  
    // 1. 🚀 MOSTRAR EL SWAL DE CARGA INMEDIATAMENTE
    Swal.fire({
      title: 'Cargando...',
      text: 'Obteniendo listado de series',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  
    this.serieService
      .listSubsecciones(this.idSubseccion, page, this.search)
      .subscribe({
        next: (res: any) => {
          // Se guarda sin filtrar: los permisos son otra petición y pueden
          // llegar después que esta lista
          this.seriesSinFiltrar = res.data || [];
          this.totalSinFiltrar = res.total || this.seriesSinFiltrar.length;
          this.currentPage = page;
          console.log('Series originales:', this.seriesSinFiltrar);

          this.aplicarFiltroPermisos();

          Swal.close(); // ✅ CERRAR SWAL
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error:', err);
          Swal.close(); // ❌ CERRAR SI HAY ERROR
          Swal.fire('Error', 'No se pudieron cargar las series', 'error');
        }
      });
  }


  getIndex(index: number): number {
      // Fórmula: (Página actual - 1) * Tamaño de página + Índice local + 1
      return (this.currentPage - 1) * this.pageSize + index + 1;
  }

  createSerie(idSubseccion: number) {
    const modalRef = this.modalService.open(CreateSerieComponent, {
      centered: true,
      size: 'xl',
    });
  
    modalRef.componentInstance.idSubseccion = this.idSubseccion;
    modalRef.componentInstance.nombreSubseccion = this.nombreSubSeccion;
  
    // 🔹 Aquí escuchamos el evento que emite el hijo
    modalRef.componentInstance.SubseccionC.subscribe(() => {
      console.log("Serie creada, recargando listado...");
      this.loadSubsecciones(this.currentPage); // 🔹 Esto refresca todo
    });
  }
  
  



  editarSerie(sub: any) {
    const modalRef = this.modalService.open(EditSerieComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static'
    });
  
    // 👉 Enviamos TODA la serie al modal
    modalRef.componentInstance.SERIE_SELECTED = sub;
    modalRef.componentInstance.nombreSubseccion = this.nombreSubSeccion;
    // 👉 Escuchar cuando el modal guarde cambios
    modalRef.componentInstance.serieActualizada.subscribe(() => {
      console.log("Serie editada, recargando listado...");
  
      // 🔹 Refrescar todas las subsecciones desde el backend
      this.loadSubsecciones(this.currentPage);
      this.cdr.detectChanges();
    });
  }
  
  

  deleteSerie(sub: any) {
    console.log("Intentando eliminar serie:", sub);
    console.log("ID de la serie:", sub.id_serie);
  
    const modalRef = this.modalService.open(DeleteSerieComponent, { centered: true, size: 'md' });
    modalRef.componentInstance.SERIE_SELECTED = sub;
  
    modalRef.componentInstance.SerieEliminada.subscribe(() => {
      console.log("Serie actualizada, recargando listado...");
      
      // 🔹 Refrescar desde el backend
      this.loadSubsecciones(this.currentPage);
    });
  }
  
  
  

  
  verDocumentacion(sub: any) {
    // 🔹 Verificamos si la serie tiene parámetros indexados
    if (sub.estado_parametros === 'No') {
      // Mostrar alerta
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debe ingresar al menos un parámetro de indexación documental para esta serie.',
        confirmButtonText: 'Aceptar'
      });
      return; // 🚫 Salimos, no navegamos
    }
  
    // 🔹 Si tiene parámetros, navegamos
    const idSerie = sub.id_serie;
    console.log('Navegando a Serie con ID:', idSerie);
  
    this.router.navigate(['/indexacion-serie/list'], { queryParams: { idSerie } })
      .then(success => console.log('Navegación exitosa:', success))
      .catch(err => console.error('Error en navegación:', err));
  }
  


  create(sub: any) {
    const idSeccion = sub.id_proyecto;
    console.log('Navegando a SubSeccion1 con ID:', idSeccion);

    this.router
      .navigate(['/subseccion1/list'], { queryParams: { idSeccion } })
      .then((success) => console.log('Navegación exitosa:', success))
      .catch((err) => console.error('Error en navegación:', err));
  }

  crearSubSerie(sub: any) {
    if (!sub || !sub.id_serie) {
      console.warn('No existe ID de serie en la fila seleccionada.');
      return;
    }

    const idSerie = sub.id_serie; // ✅ ID de la serie directamente de la fila
    console.log('ID de la serie seleccionado:', idSerie);

    this.router
      .navigate(['/subserie/list'], { queryParams: { idSerie } })
      .then((success) => console.log('Navegación exitosa:', success))
      .catch((err) => console.error('Error en navegación:', err));
  }




  
 

  PermisosSerie(idUser: number) {
  console.log('Ejecutando PermisosSerie con ID:', idUser);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  this.serieService.permisosUsuario(idUser.toString()).subscribe({
    next: (resp: any) => {
      console.log('Permisos del usuario para Serie recibidos:', resp);

      // Guardar todos los permisos completos
      this.permisosDocumentales = resp.permissions || [];

      // Crear mapa por id_serie
      this.permisosPorSerie = this.permisosDocumentales.reduce((acc, permiso) => {
        if (permiso.id_serie !== null) {
          acc[permiso.id_serie] = permiso; // Guardamos todo el objeto
        }
        return acc;
      }, {} as { [id_serie: number]: any });

      console.log('Permisos por Serie:', this.permisosPorSerie);

      // Si la lista ya había llegado, se vuelve a filtrar ahora que sí hay
      // permisos. Sin esto quedaba vacía hasta recargar la página.
      this.aplicarFiltroPermisos();

      // Evaluar permisos globales para Serie
      this.puedeCrearSerie = this.permisosDocumentales.some(p =>
        p.id_serie !== null &&
        p.crear === true &&
        p.id_empresa === user.id_empresa
      );

      this.puedeEditarSerie = this.permisosDocumentales.some(p =>
        p.id_serie !== null &&
        p.editar === true &&
        p.id_empresa === user.id_empresa
      );

      this.puedeEliminarSerie = this.permisosDocumentales.some(p =>
        p.id_serie !== null &&
        p.eliminar === true &&
        p.id_empresa === user.id_empresa
      );

      console.log('¿Puede crear Serie?', this.puedeCrearSerie);
      console.log('¿Puede editar Serie?', this.puedeEditarSerie);
      console.log('¿Puede eliminar Serie?', this.puedeEliminarSerie);
    },
    error: (err) => {
      console.error('Error permisos Serie', err);
      this.permisosDocumentales = [];
      this.permisosPorSerie = {};
      this.puedeCrearSerie = false;
      this.puedeEditarSerie = false;
      this.puedeEliminarSerie = false;
    }
  });
}

}
