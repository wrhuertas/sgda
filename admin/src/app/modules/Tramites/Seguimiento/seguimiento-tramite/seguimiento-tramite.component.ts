import { ChangeDetectorRef, Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { RegistrarAsignacionComponent } from '../../asignar-tramite/registrar-asignacion/registrar-asignacion.component';
import { SeguimientoService } from '../service/seguimiento.service';

@Component({
  selector: 'app-seguimiento-tramite',
  templateUrl: './seguimiento-tramite.component.html',
  styleUrls: ['./seguimiento-tramite.component.scss']
})
export class SeguimientoTramiteComponent implements OnInit {

  @Output() TramitesE: EventEmitter<any> = new EventEmitter();
  @Input() TRAMITE_SELECTED: any;

  // 🔹 Variables para el HTML
  numeroTramite: string = '';
  dni: string = '';
  showResultado: boolean = false;
  tramite: any = null;
  documentos: any[] = [];

  // 🔹 Variables existentes
  search: string = '';
  tramites: any[] = [];
  isLoading$: any;
  id_empresa!: number;
  id_usuario!: number;
  nombre: string = '';
  estado: number = 1;
  totalPages: number = 0;
  currentPage: number = 1;
  areas: any[] = [];
  user: any;
  isLoading: any;
criterioBusqueda: string = ''; // por defecto se busca por número de trámite
cliente: any = null; // <-- esto soluciona el error de TypeScript
  timeline: any[] = [];

  asignaciones: any[] = [];
  constructor(
    public modalService: NgbModal,
    public seguimientoTramite: SeguimientoService,
    public toast: ToastrService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService,
  ) { }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user || !user.id) {
      this.toast.error('Usuario no logeado');
      return;
    }

    this.user = user;
    this.id_usuario = user.id;

    if (!user.id_empresa) {
      this.toast.error('No se encontró la empresa del usuario');
      return;
    }

    this.id_empresa = user.id_empresa;

    this.isLoading$ = this.seguimientoTramite.isLoading$;
    this.listatramites();
    this.cargarArea();
  }

  // ==========================
  // Buscar trámite por input
  // ==========================
  buscarTramite() {
  if (!this.numeroTramite && !this.dni) {
    alert('Ingrese número de trámite o DNI');
    return;
  }

  this.seguimientoTramite.buscarTramite(this.numeroTramite, this.dni, this.id_empresa)
    .subscribe((resp: any) => {
      if (resp && resp.tramites && resp.tramites.length > 0) {
        this.tramite = resp.tramites[0];
        this.cliente = resp.cliente;
        this.timeline = [];

        // 1. Agregamos el Trámite Inicial (el origen de todo)
        this.timeline.push({
          tipo: 'Trámite Inicial',
          // Aquí podrías poner el nombre del área de origen si lo tienes
          area_destino: 'ORIGEN / MESA DE PARTES', 
          estado_tramite: 'REGISTRADO',
          documentos: this.tramite.documentos || [], // Documentos cargados al inicio
          fecha: this.tramite.created_at,
          asunto: this.tramite.asunto_tramite
        });

        // 2. Agregamos las asignaciones (el recorrido)
        for (let asig of this.tramite.asignaciones || []) {
          this.timeline.push({
            tipo: 'Derivación',
            area_destino: asig.id_area_destino, // Si tienes el nombre del área, úsalo aquí
            estado_tramite: asig.estado_tramite || 'DERIVADO',
            documentos: [], // Normalmente las derivaciones no llevan nuevos docs, pero puedes dejarlos si aplica
            fecha: asig.fecha_registro,
            asunto: 'Documento derivado para atención.'
          });
        }

        this.showResultado = true;
      } else {
        this.showResultado = false;
        alert('No se encontraron resultados');
      }
    });
}


  // ==========================
  // Listado de trámites
  // ==========================
  listatramites(page = 1) {
    if (!this.id_empresa || !this.id_usuario) {
      this.toast.error('Datos del usuario incompletos');
      return;
    }

    this.seguimientoTramite
      .listTramites(this.id_empresa, this.id_usuario, page, this.search)
      .subscribe((resp: any) => {
        this.tramites = resp.tramites ?? [];
        this.totalPages = resp.total_tramites ?? 0;
        this.currentPage = page;
      });
  }

  // ==========================
  // Cargar áreas asignadas
  // ==========================
  cargarArea() {
    const user = this.authService.user;
    if (!user || !user.id) return;

    this.seguimientoTramite.configArea(user.id).subscribe({
      next: (resp: any) => {
        this.areas = resp?.areas || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando áreas:', err);
        this.toast.error('No se pudo cargar las áreas');
      }
    });
  }

  // ==========================
  // Abrir modal de seguimiento
  // ==========================
  verSeguimiento(tramite: any) {
    const modalRef = this.modalService.open(RegistrarAsignacionComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.componentInstance.tramiteDatos = tramite;
    modalRef.componentInstance.areas = this.areas;

    modalRef.componentInstance.TramiteC.subscribe(() => {
      this.listatramites(this.currentPage);
    });
  }

  // ==========================
  // Descargar documento
  // ==========================
  descargarArchivo(doc: any) {
    const url = doc.ruta_archivo;
    window.open(url, '_blank');
  }

  // ==========================
  // Cambiar página
  // ==========================
  loadPage($event: any) {
    this.listatramites($event);
  }




  // Función para validar si se puede habilitar el botón
esValidoBusqueda(): boolean {
  switch (this.criterioBusqueda) {
    case 'tramite':
      return this.numeroTramite.trim().length > 0;
    case 'dni':
      return this.dni.trim().length > 0;
    case 'ambos':
      return this.numeroTramite.trim().length > 0 && this.dni.trim().length > 0;
    default:
      return false;
  }
}

onCambioCriterio(valor: string) {
  // Limpiar inputs cada vez que cambia el criterio
  this.numeroTramite = '';
  this.dni = '';
}


}
