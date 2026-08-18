import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { AsignartramiteService } from '../service/asignartramite.service';
import { URL_BACKEND } from 'src/app/config/config';

/**
 * Datos del trámite, tal como se ven en Despacho.
 *
 * Acá se contempla además el caso de los trámites creados por memorandum, que
 * no tienen trámite: en ese caso no hay a quién consultar y se muestran los
 * datos de la propia asignación.
 */
@Component({
  selector: 'app-ver-datos',
  templateUrl: './ver-datos.component.html',
  styleUrls: ['./ver-datos.component.scss']
})
export class VerDatosComponent implements OnInit {

  @Input() id_tramite!: number;
  @Input() tramiteDatos!: any;
  @Input() areas: any[] = [];
  @Output() tramiteC = new EventEmitter<void>();

  tramite: any = null;
  cargando: boolean = false;

  /** Qué bloques se muestran, según los campos que traiga la respuesta */
  tieneTipoTramiteYDocumento: boolean = false;
  tieneCiudadYFecha: boolean = false;

  /** Se prende cuando el registro no viene de un trámite sino de un memorandum */
  sinTramite: boolean = false;

  constructor(
    public activeModal: NgbActiveModal,
    public AsignartramiteService: AsignartramiteService,
    public toast: ToastrService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService,
    public modalService: NgbModal,
  ) {}

  ngOnInit() {
    if (!this.id_tramite) {
      // Trámite creado por memorandum: no hay trámite que consultar
      this.sinTramite = true;
      this.tramite = this.datosDesdeAsignacion();
      this.detectarTiposTramite();
      return;
    }

    this.datosTramite(this.id_tramite);
  }

  datosTramite(id_tramite: number) {
    this.cargando = true;

    this.AsignartramiteService.datosTramite(id_tramite).subscribe({
      next: (resp: any) => {
        this.tramite = resp?.tramite ?? resp?.data ?? resp;
        this.detectarTiposTramite();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando trámite:', err);

        // Si falla, al menos se muestra lo que ya tenía el listado
        this.tramite = this.tramiteDatos ?? null;
        this.detectarTiposTramite();
        this.cargando = false;
        this.toast.error('No se pudo cargar el trámite');
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Arma la ficha con lo que trae la asignación, para los memorandos que no
   * tienen trámite. Se respetan los mismos nombres de campo que usa la
   * plantilla, así no hace falta una vista aparte.
   */
  private datosDesdeAsignacion(): any {
    const d = this.tramiteDatos || {};
    const asignacion = d.asignacion || d;

    return {
      numero_tramite:        asignacion.numero_tramite || asignacion.num_documento_interno || null,
      num_documento_interno: asignacion.num_documento_interno || null,
      asunto:                asignacion.asunto_asignar || asignacion.asunto || null,
      tipo_tramite_nombre:   d.tipo_tramite_nombre || asignacion.tipo_tramite_nombre || null,
      tipo_documento_nombre: d.tipo_documento_nombre || asignacion.tipo_documento_nombre || null,

      // Un memorandum es interno: el remitente es un funcionario, no un ciudadano
      cliente_nombre:        d.usuario_origen?.nombre_completo
                              || d.usuario_origen?.name
                              || null,
      cliente_razon_social:  null,
      cedula_ruc:            d.usuario_origen?.n_document || null,
      cliente_telefono:      d.usuario_origen?.phone || null,
      cliente_correo:        d.usuario_origen?.email || null,

      anexos:                d.anexos || [],
      documento_principal:   d.documento_principal || null,
    };
  }

  /** Se decide qué mostrar según lo que realmente vino */
  detectarTiposTramite() {
    if (!this.tramite) { return; }

    this.tieneTipoTramiteYDocumento = !!(this.tramite.tipo_tramite_nombre || this.tramite.tipo_documento_nombre);
    this.tieneCiudadYFecha = !!(this.tramite.ciudad || this.tramite.fecha_tramite_oficio);
  }

  /** Arma la URL pública del archivo guardado en el backend */
  construirUrlArchivo(ruta: string): string {
    if (!ruta) { return ''; }

    if (ruta.startsWith('http://') || ruta.startsWith('https://')) {
      return ruta;
    }

    // URL_BACKEND ya termina en barra
    return URL_BACKEND + 'storage/' + ruta;
  }

  cerrar() {
    this.activeModal?.close();
  }
}
