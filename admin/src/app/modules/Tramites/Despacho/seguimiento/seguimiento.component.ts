import { Component, Input, Output, EventEmitter, OnInit, Optional } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { DespachoService } from '../service/despacho.service';
import { URL_SERVICIOS } from 'src/app/config/config';
import Swal from 'sweetalert2';
import { NuevoTramiteComponent } from '../nuevo-tramite/nuevo-tramite.component';
import { VerActasComponent } from '../ver-actas/ver-actas.component';

@Component({
  selector: 'app-seguimiento',
  templateUrl: './seguimiento.component.html',
  styleUrls: ['./seguimiento.component.scss']
})
export class SeguimientoComponent implements OnInit {

  // Datos recibidos del padre (mantenemos id_tramite y tramiteDatos por compatibilidad)
  @Input() id_tramite!: number;
  @Input() tramiteDatos!: any;
  @Input() areas!: any[];
  // Cuando se usa dentro de otra vista (pestaña) y no como modal propio,
  // se ocultan la cabecera y el pie de modal.
  @Input() embebido: boolean = false;

  @Output() tramiteC: EventEmitter<any> = new EventEmitter();

  private yaConsultado = false;
  public responseData: any = null;
  public loading: boolean = false;
  public expandedAsignacion: number | null = null;
  
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
  

  constructor(
    public modalService: NgbModal,
    // Opcional: cuando el componente se usa embebido en una pestaña no existe
    // un modal propio al cual cerrar.
    @Optional() public activeModal: NgbActiveModal | null,
    public despachoService: DespachoService,
    public toast: ToastrService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    console.log('=== Datos recibidos en SeguimientoComponent ===');
    console.log('id_tramite (input):', this.id_tramite);
    console.log('tramiteDatos:', this.tramiteDatos);
    console.log('areas:', this.areas);
    console.log('===============================================');

    const user = this.authService?.currentUserValue ?? JSON.parse(localStorage.getItem('user') || '{}');
    const id_usuario = user?.id ?? null;
    const id_empresa = user?.id_empresa ?? null;

    // Intentar resolver id_asignacion_tramite desde varias posibles ubicaciones
    const id_asignacion_tramite = this.tramiteDatos?.asignacion?.id_asignacion_tramite
      ?? this.tramiteDatos?.id_asignacion_tramite
      ?? this.tramiteDatos?.id_asignar_tramite
      ?? this.tramiteDatos?.id_asignar
      ?? this.tramiteDatos?.id_asignacion
      ?? null;

    // Intentar resolver id_tramite desde posibles ubicaciones
    const id_tramite: number = this.id_tramite
      ?? this.tramiteDatos?.tramite?.id_tramite
      ?? this.tramiteDatos?.id_tramite
      ?? this.tramiteDatos?.asignacion?.id_tramite
      ?? null;

    console.log('resolved id_asignacion_tramite:', id_asignacion_tramite);
    console.log('resolved id_empresa:', id_empresa);
    console.log('resolved id_usuario:', id_usuario);
    console.log('resolved id_tramite:', id_tramite);

    this.traerDatosAsinacion(id_asignacion_tramite, id_empresa, id_usuario, id_tramite);
  }

traerDatosAsinacion(
  id_asignacion_tramite: number, 
  id_empresa: number, 
  id_usuario: number, 
  id_tramite: number   // 👈 ESTE es el que faltaba declarar
) {

  if (!id_asignacion_tramite) {
    this.toast.error('No se encontró id_asignacion_tramite');
    return;
  }
  if (!id_empresa) {
    this.toast.error('No se encontró id_empresa');
    return;
  }
  if (!id_usuario) {
    this.toast.error('No se encontró id_usuario');
    return;
  }
  if (!id_tramite) {
    this.toast.error('No se encontró id_tramite');
    return;
  }

  const payload = {
    id_asignacion_tramite: Number(id_asignacion_tramite),
    id_empresa: Number(id_empresa),
    id_usuario: Number(id_usuario),
    id_tramite: Number(id_tramite)
  };

  console.log('[Seguimiento] payload enviado:', payload);

  this.loading = true;
  this.despachoService.traerDatosAsinacion(payload).subscribe({
    next: (resp: any) => {
      this.loading = false;
      console.log('[Seguimiento] respuesta del servicio:', resp);
      this.responseData = resp;
      this.toast.success('Datos de asignación recibidos');
      try { this.tramiteC.emit(resp); } catch {}
      // No cerramos el modal: mostramos la información al usuario en la UI
    },
    error: (err) => {
      this.loading = false;
      console.error('Error al traer datos de asignación:', err);
      this.toast.error('No se pudieron obtener los datos');
    }
  });
}

  toggleAsignacion(index: number) {
    this.expandedAsignacion = this.expandedAsignacion === index ? null : index;
  }

  abrirDocumento(ruta: string) {
    if (!ruta) return;
    // Construir url absoluta basada en URL_SERVICIOS
    const cleanBase = String(URL_SERVICIOS || '').replace(/\/+$/, '');
    let cleanRuta = String(ruta || '').replace(/^\/+/, '');
    // Si ya es URL completa
    if (/^https?:\/\//i.test(cleanRuta)) {
      window.open(cleanRuta, '_blank');
      return;
    }
    // si ruta contiene 'storage/' evitar duplicar
    if (cleanRuta.startsWith('storage/')) {
      cleanRuta = cleanRuta.replace(/^storage\//, '');
    }
    const url = `${cleanBase}/storage/${cleanRuta}`;
    window.open(url, '_blank');
  }




   mostrarActas(actas: any[]) {
    // Abrir modal VerActasComponent y pasar las actas
    const modalRef = this.modalService.open(VerActasComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });
    modalRef.componentInstance.actas = actas || [];
    const asignId = actas && actas.length > 0 ? (actas[0].asignar_tramite_id ?? actas[0].id_asignacion_tramite ?? null) : null;
    modalRef.componentInstance.id_asignacion_tramite = asignId;
    // También pasar id_tramite si es necesario
    modalRef.componentInstance.id_tramite = this.responseData?.tramite?.id_tramite ?? null;
  }

  // Cerrar modal (sólo aplica cuando no está embebido en una pestaña)
  cerrarModal() {
    this.activeModal?.close();
  }


}
