import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../auth';
import { CreateSerieComponent } from '../../serie/create-serie/create-serie.component';
import { SubserieService } from '../service/subserie.service';
import { CreateSubserieComponent } from '../create-subserie/create-subserie.component';
import { EditSubserieComponent } from '../edit-subserie/edit-subserie.component';
import Swal from 'sweetalert2';
import { DeleteSubserieComponent } from '../delete-subserie/delete-subserie.component';

@Component({
  selector: 'app-list-subserie',
  templateUrl: './list-subserie.component.html',
  styleUrls: ['./list-subserie.component.scss'],
})
export class ListSubserieComponent {
  idSerie!: number;
  nombreSerie!: string;
  search: string = '';

  SUBSECCIONES: any[] = [];
  totalPages: number = 0;
  currentPage: number = 1;
  isLoading$: any;

  usuario_id!: number;

   esAdmin: boolean = false;

  jerarquia: any[] = [];

  permisosDocumentales: any[] = [];
  permisosPorSubSerie: { [id_subserie: number]: any } = {};

  puedeCrearSubSerie: boolean = false;
  puedeEditarSubSerie: boolean = false;
  puedeEliminarSubSerie: boolean = false;


  puedeVerSubSerie: boolean = false;
  puedeBuscarSubSerie: boolean = false;
  puedeSubirDocumentosSubSerie: boolean = false;
  puedeVerDocumentoSubSerie: boolean = false;
  puedeRegistrarDatosSubSerie: boolean = false;
  puedeIndexarSubSerie: boolean = false;
  puedeIndexarMasivoSubSerie: boolean = false;
  puedeEliminarDocumentoSubSerie: boolean = false;
  puedeFirmarDocumentoSubSerie: boolean = false;
  puedeLimpiarDocumentoSubSerie: boolean = false;


  constructor(
    private route: ActivatedRoute,
    private subserieService: SubserieService,
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
        console.log('Usuario ADMIN → permisos completos (SubSerie)');

        this.puedeCrearSubSerie = true;
        this.puedeEditarSubSerie = true;
        this.puedeEliminarSubSerie = true;

        this.cdr.detectChanges(); // 👈 OBLIGATORIO
      }
      // 👇 USUARIO NORMAL
      else if (userlogeado?.id) {
        this.PermisosSubSerie(userlogeado.id);
      }


    this.route.queryParams.subscribe((params) => {
      this.idSerie = params['idSerie']; // 👈 ahora coincide
      console.log('Serie recibida:', this.idSerie);

      if (this.idSerie) {
        this.loadSubSerie();

        this.subserieService.getSubSeccionById(this.idSerie).subscribe(
          (data: any) => {
            console.log('📦 Respuesta completa:', data);

            // Nombre de la serie
            this.nombreSerie = data.serie.nombre;

            // Ruta completa (proyecto + serie)
            this.jerarquia = data.jerarquia;

            console.log('✅ Jerarquía:', this.jerarquia);

            this.cdr.detectChanges();
          },
          (error) => {
            console.error('❌ Error al traer la serie:', error);
          }
        );

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


loadSubSerie(page: number = 1) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  this.subserieService
    .listSubSerie(this.idSerie, page, this.search)
    .subscribe({
      next: (res: any) => {
        const subseriesOriginales = res.data || [];
        
        if (this.isAdminUser(user)) {
          this.SUBSECCIONES = subseriesOriginales;
        } else {
          this.SUBSECCIONES = subseriesOriginales.filter((subserie: any) => {
            // USAMOS id_serie porque así viene en tu captura de Network
            const idKey = subserie.id_serie; 
            const permiso = this.permisosPorSubSerie[idKey];

            // VALIDACIÓN FLEXIBLE: Acepta true, 1 o "1" (según tu DB)
            const puedeVer = permiso?.ver == true || permiso?.ver == 1;

            return puedeVer;
          });
        }

        this.totalPages = res.total || this.SUBSECCIONES.length;
        this.currentPage = page;
        
        // VITAL: Marcar que la carga terminó para que el HTML muestre la info
      
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error:', err);
      
        this.cdr.detectChanges();
      }
    });
}



  createSerie(idSerie: number) {
    console.log('ID del proyecto recibido en el modal:', idSerie);

    const modalRef = this.modalService.open(CreateSubserieComponent, {
      centered: true,
      size: 'xl',
    });

    // Usa el idSerie recibido como argumento, no this.idSerie
    modalRef.componentInstance.idSerie = idSerie;

    // Asegúrate que nombreSerie ya esté cargado antes de asignarlo
    if (this.nombreSerie) {
      modalRef.componentInstance.nombreSerie = this.nombreSerie;
    } else {
      console.warn('⚠️ nombreSerie todavía no está definido');
    }

    modalRef.componentInstance.SubseccionC.subscribe((subseccion: any) => {
      console.log('Subsección creada:', subseccion);
      this.loadSubSerie(this.currentPage);
    });
  }

  editarSubSerie(sub: any) {
    const modalRef = this.modalService.open(EditSubserieComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static'
    });
  
    // 👉 Enviamos TODA la serie al modal
    modalRef.componentInstance.SERIE_SELECTED = sub;
    modalRef.componentInstance.nombreSerie = this.nombreSerie;
    // 👉 Escuchar cuando el modal guarde cambios
    modalRef.componentInstance.serieActualizada.subscribe(() => {
      console.log("Serie editada, recargando listado...");
  
      // 🔹 Refrescar todas las subsecciones desde el backend
      this.loadSubSerie(this.currentPage);
      this.cdr.detectChanges();
    });
  }

 

  
  deleteSubSerie(sub: any) {
    console.log("Intentando eliminar serie:", sub);
    console.log("ID de la serie:", sub.id_serie);
  
    const modalRef = this.modalService.open(DeleteSubserieComponent, { centered: true, size: 'md' });
    modalRef.componentInstance.SERIE_SELECTED = sub;
  
    modalRef.componentInstance.SerieEliminada.subscribe(() => {
      console.log("Serie actualizada, recargando listado...");
      
      // 🔹 Refrescar desde el backend
      this.loadSubSerie(this.currentPage);
    });
  }

     verDocumentacion(sub: any) {
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
      const idSerie = sub.id_serie; // ✅ ahora tomamos el id_serie
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
    // Tomar la primera sub-subsección
    const primeraSub = sub.subsecciones?.[0];

    if (!primeraSub) {
      console.warn('No hay sub-subsecciones en esta fila.');
      return;
    }

    const idSeccion = primeraSub.id_proyecto; // ✅ ahora sí es el ID de la sub-subsección
    console.log('ID tomado de la sub-subsección:', idSeccion);

    this.router
      .navigate(['/serie/list'], { queryParams: { idSeccion } })
      .then((success) => console.log('Navegación exitosa:', success))
      .catch((err) => console.error('Error en navegación:', err));
  }





 PermisosSubSerie(idUser: number) {
  console.log('Ejecutando PermisosSubSerie con ID:', idUser);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  this.subserieService.permisosUsuario(idUser.toString()).subscribe({
    next: (resp: any) => {
      console.log('Permisos del usuario para Subserie recibidos:', resp);

      // Guardar todos los permisos completos
      this.permisosDocumentales = resp.permissions || [];

      // Crear mapa por id_subserie
      this.permisosPorSubSerie = this.permisosDocumentales.reduce((acc, permiso) => {
        if (permiso.id_subserie !== null) {
          acc[permiso.id_subserie] = permiso; // Guardamos todo el objeto
        }
        return acc;
      }, {} as { [id_subserie: number]: any });

      console.log('Permisos por Subserie:', this.permisosPorSubSerie);

      // Evaluar permisos globales para Subserie
      this.permisosDocumentales.forEach(p => {
        if (p.id_subserie !== null && p.id_empresa === user.id_empresa) {
          this.puedeCrearSubSerie = this.puedeCrearSubSerie || p.crear;
          this.puedeEditarSubSerie = this.puedeEditarSubSerie || p.editar;
          this.puedeEliminarSubSerie = this.puedeEliminarSubSerie || p.eliminar;
          this.puedeVerSubSerie = this.puedeVerSubSerie || p.ver;
          this.puedeBuscarSubSerie = this.puedeBuscarSubSerie || p.buscar;
          this.puedeSubirDocumentosSubSerie = this.puedeSubirDocumentosSubSerie || p.subir_documentos;
          this.puedeVerDocumentoSubSerie = this.puedeVerDocumentoSubSerie || p.ver_documento;
          this.puedeRegistrarDatosSubSerie = this.puedeRegistrarDatosSubSerie || p.registrar_datos;
          this.puedeIndexarSubSerie = this.puedeIndexarSubSerie || p.indexar;
          this.puedeIndexarMasivoSubSerie = this.puedeIndexarMasivoSubSerie || p.indexar_masivo;
          this.puedeEliminarDocumentoSubSerie = this.puedeEliminarDocumentoSubSerie || p.eliminar_documento;
          this.puedeFirmarDocumentoSubSerie = this.puedeFirmarDocumentoSubSerie || p.firmar_documento;
          this.puedeLimpiarDocumentoSubSerie = this.puedeLimpiarDocumentoSubSerie || p.limpiar_documento;
        }
      });

      console.log('Permisos globales Subserie:', {
        crear: this.puedeCrearSubSerie,
        editar: this.puedeEditarSubSerie,
        eliminar: this.puedeEliminarSubSerie,
        ver: this.puedeVerSubSerie,
        buscar: this.puedeBuscarSubSerie,
        subir_documentos: this.puedeSubirDocumentosSubSerie,
        ver_documento: this.puedeVerDocumentoSubSerie,
        registrar_datos: this.puedeRegistrarDatosSubSerie,
        indexar: this.puedeIndexarSubSerie,
        indexar_masivo: this.puedeIndexarMasivoSubSerie,
        eliminar_documento: this.puedeEliminarDocumentoSubSerie,
        firmar_documento: this.puedeFirmarDocumentoSubSerie,
        limpiar_documento: this.puedeLimpiarDocumentoSubSerie
      });
    },
    error: (err) => {
      console.error('Error permisos Subserie', err);
      this.permisosDocumentales = [];
      this.permisosPorSubSerie = {};
      this.puedeCrearSubSerie = false;
      this.puedeEditarSubSerie = false;
      this.puedeEliminarSubSerie = false;
      this.puedeVerSubSerie = false;
      this.puedeBuscarSubSerie = false;
      this.puedeSubirDocumentosSubSerie = false;
      this.puedeVerDocumentoSubSerie = false;
      this.puedeRegistrarDatosSubSerie = false;
      this.puedeIndexarSubSerie = false;
      this.puedeIndexarMasivoSubSerie = false;
      this.puedeEliminarDocumentoSubSerie = false;
      this.puedeFirmarDocumentoSubSerie = false;
      this.puedeLimpiarDocumentoSubSerie = false;
    }
  });
}


}
