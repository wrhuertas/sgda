import { Component, Input, Output, EventEmitter, OnInit, Optional } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { AsignartramiteService } from '../service/asignartramite.service';
import { URL_SERVICIOS } from 'src/app/config/config';
import { VerActasComponent } from '../ver-actas/ver-actas.component';

@Component({
  selector: 'app-seguimiento',
  templateUrl: './seguimiento.component.html',
  styleUrls: ['./seguimiento.component.scss']
})
export class SeguimientoComponent implements OnInit {

  // Datos recibidos del padre
  @Input() id_tramite!: number;
  @Input() tramiteDatos!: any;
  @Input() areas!: any[];
  @Input() soloActas: boolean = false;
  // Cuando se usa dentro de otra vista (pestaña) y no como modal propio,
  // se ocultan la cabecera y el pie de modal.
  @Input() embebido: boolean = false;

  @Output() tramiteC: EventEmitter<any> = new EventEmitter();

  public responseData: any = null;
  public loading: boolean = false;
  public expandedAsignacion: number | null = null;

  constructor(
    // Opcional: cuando el componente se usa embebido en una pestaña no existe
    // un modal propio al cual cerrar.
    @Optional() public activeModal: NgbActiveModal | null,
    public modalService: NgbModal,
    public AsignartramiteService: AsignartramiteService,
    public toast: ToastrService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    const user = this.authService?.currentUserValue ?? JSON.parse(localStorage.getItem('user') || '{}');
    const id_usuario = user?.id ?? null;
    const id_empresa = user?.id_empresa ?? null;

    // Resolver id_asignacion_tramite desde varias posibles ubicaciones
    const id_asignacion_tramite = this.tramiteDatos?.asignacion?.id_asignacion_tramite
      ?? this.tramiteDatos?.id_asignacion_tramite
      ?? this.tramiteDatos?.id_asignar_tramite
      ?? this.tramiteDatos?.id_asignar
      ?? this.tramiteDatos?.id_asignacion
      ?? null;

    // Resolver id_tramite desde posibles ubicaciones
    const id_tramite: number = this.id_tramite
      ?? this.tramiteDatos?.tramite?.id_tramite
      ?? this.tramiteDatos?.id_tramite
      ?? this.tramiteDatos?.asignacion?.id_tramite
      ?? null;

    this.traerDatosAsinacion(id_asignacion_tramite, id_empresa, id_usuario, id_tramite);
  }

  traerDatosAsinacion(
    id_asignacion_tramite: number,
    id_empresa: number,
    id_usuario: number,
    id_tramite: number
  ) {
    if (!id_asignacion_tramite) { this.toast.error('No se encontró id_asignacion_tramite'); return; }
    if (!id_empresa) { this.toast.error('No se encontró id_empresa'); return; }
    if (!id_usuario) { this.toast.error('No se encontró id_usuario'); return; }

    // El id_tramite ya no es obligatorio: los trámites creados por memorandum
    // no tienen uno, y el backend arma el seguimiento desde la asignación.
    const payload: any = {
      id_asignacion_tramite: Number(id_asignacion_tramite),
      id_empresa: Number(id_empresa),
      id_usuario: Number(id_usuario),
      id_tramite: id_tramite ? Number(id_tramite) : null
    };

    console.log('[Seguimiento] payload enviado:', payload);

    this.loading = true;
    this.AsignartramiteService.traerDatosAsinacion(payload).subscribe({
      next: (resp: any) => {
        this.loading = false;
        console.log('[Seguimiento] respuesta del servicio:', resp);
        this.responseData = resp;
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al traer datos de asignación:', err);
        this.toast.error('No se pudieron obtener los datos');
      }
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    } catch {
      return String(dateStr);
    }
  }

  formatSize(bytes: number | null): string {
    const b = Number(bytes) || 0;
    const kb = Math.round(b / 1024);
    return kb.toString();
  }

  toggleAsignacion(index: number) {
    this.expandedAsignacion = this.expandedAsignacion === index ? null : index;
  }

  abrirDocumento(ruta: string) {
    if (!ruta) return;
    const cleanBase = String(URL_SERVICIOS || '').replace(/\/+$/, '');
    let cleanRuta = String(ruta || '').replace(/^\/+/, '');
    if (/^https?:\/\//i.test(cleanRuta)) {
      window.open(cleanRuta, '_blank');
      return;
    }
    if (cleanRuta.startsWith('storage/')) {
      cleanRuta = cleanRuta.replace(/^storage\//, '');
    }
    const url = `${cleanBase}/storage/${cleanRuta}`;
    window.open(url, '_blank');
  }

  // Abrir modal VerActasComponent con las actas (igual que el seguimiento de Despacho)
  mostrarActas(actas: any[]) {
    if (!Array.isArray(actas) || actas.length === 0) {
      this.toast.info('No hay actas para mostrar');
      return;
    }
    const modalRef = this.modalService.open(VerActasComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });
    modalRef.componentInstance.actas = actas || [];
    const asignId = actas.length > 0 ? (actas[0].asignar_tramite_id ?? actas[0].id_asignacion_tramite ?? null) : null;
    modalRef.componentInstance.id_asignacion_tramite = asignId;
    modalRef.componentInstance.id_tramite = this.responseData?.tramite?.id_tramite ?? null;
  }

  // Cerrar modal (sólo aplica cuando no está embebido en una pestaña)
  cerrarModal() {
    this.activeModal?.close();
  }
}
