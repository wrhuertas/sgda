import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CertificadoService } from '../service/certificado.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { VerCertificadoComponent } from '../ver-certificado/ver-certificado.component';

@Component({
  selector: 'app-editar-certificado',
  templateUrl: './editar-certificado.component.html',
  styleUrls: ['./editar-certificado.component.scss']
})
export class EditarCertificadoComponent implements OnInit {
  @Input() PRESTAMO_SELECTED: any; 
  @Output() PrestamoE: EventEmitter<any> = new EventEmitter();

  observacion: string = '';
  isLoading: boolean = false;
  search_user: string = '';

  user: any; 
  id_empresa: any;
  usuarios_list: any[] = [];
  usuario_selected: any = null;

  // Variables para Trámite
  numero_tramite: string = '';
  id_tramite: number | null = null;

  // Variables espejo de crear
  texto: string = '';
  search_doc: string = '';
  documentos_visualizar: any[] = [];
  resultados: any[] = [];
  documentos_seleccionados: any[] = [];
  documento_selected: any = null;

  get documentos_list(): any[] { return this.documentos_visualizar; }
  set documentos_list(val: any[]) { this.documentos_visualizar = val; }

  paginaActual: number = 1;
  total: number = 0;
  porPagina: number = 10;
  busquedaRealizada: boolean = false;
  criterioBusqueda: string = '';
  viewActual: string = 'lista';
  niveles: any[] = [];

  id_certificacion: number | null = null;

  // Control de fecha límite (editable en modo 0)
  fecha_limite_form: string = '';
  fecha_minima_permitida: string = '';

  constructor(
    public activeModal: NgbActiveModal,
    private certificadoService: CertificadoService,
    private cdr: ChangeDetectorRef,
    private toast: ToastrService,
    public modalService: NgbModal,
  ) { }

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
        this.user = JSON.parse(userData);
        this.id_empresa = this.user.id_empresa;
    }

    if (this.PRESTAMO_SELECTED) {
      const cert = [JSON.parse(JSON.stringify(this.PRESTAMO_SELECTED))];
      this.observacion = cert[0].observacion || '';
      if (cert[0].solicitante) this.usuario_selected = cert[0].solicitante;
      this.id_certificacion = cert[0].id_certificacion ?? null;
      this.numero_tramite = cert[0].numero_tramite || '';

      if (cert[0].documentos_detalles && Array.isArray(cert[0].documentos_detalles)) {
        this.documentos_seleccionados = [...cert[0].documentos_detalles];
      }

      // Inicialización de fecha mínima (usando fecha_solicitud si existe)
      if (cert[0].fecha_solicitud) {
        const fechaSol = new Date(cert[0].fecha_solicitud);
        if (!isNaN(fechaSol.getTime())) {
          this.fecha_minima_permitida = fechaSol.toISOString().split('T')[0];
        }
      }
      // No existe un campo específico en certificación para la fecha límite; usamos formulario local
      this.fecha_limite_form = this.fecha_minima_permitida || '';
    }
    this.cdr.detectChanges();
  }

  seleccionarDocumentoParaCert(doc: any) {
    this.documento_selected = doc;
    this.cdr.detectChanges();
  }

  buscarDocumento() {
    if (!this.search_doc || this.search_doc.trim() === '') {
        if (this.niveles && this.niveles.length > 0) {
          const ultimaSeleccion = this.niveles[this.niveles.length - 1].seleccionado;
          this.documentos_visualizar = ultimaSeleccion ? ultimaSeleccion.documentos : [];
        } else {
          this.documentos_visualizar = [...this.resultados];
        }
        return;
    }
    this.documentos_visualizar = this.documentos_visualizar.filter(doc => 
        (doc.nombre_archivo && doc.nombre_archivo.toLowerCase().includes(this.search_doc.toLowerCase())) ||
        (doc.nro_caja && doc.nro_caja.toString().includes(this.search_doc))
    );
  }

  private limpiarEstadoBusqueda() {
    this.resultados = [];
    this.total = 0;
    this.busquedaRealizada = false;
    this.criterioBusqueda = '';
  }

  buscar(page: any = 1) {
    if (page === '...') return;
    const pageNumber = parseInt(page, 10) || 1;
    this.paginaActual = pageNumber; 
    if (pageNumber === 1) {
      this.limpiarEstadoBusqueda();
      this.criterioBusqueda = this.texto; 
    }

    Swal.fire({
      title: 'Cargando documentos...',
      html: `<img src="assets/icons/pdf.png" width="50" style="opacity:0.8;"><p style="margin-top:10px; color:#555;">Espere por favor...</p>`,
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const data = { texto: this.texto, id_empresa: this.id_empresa };
    this.certificadoService.buscarDocumentos(data, pageNumber).subscribe({
      next: (resp: any) => {
        this.resultados = resp.data || [];
        this.documentos_visualizar = resp.data || []; 
        this.total = resp.total || 0;           
        this.paginaActual = resp.current_page || 1; 
        this.porPagina = resp.per_page || 10;
        this.busquedaRealizada = true;
        if (pageNumber === 1) this.viewActual = 'tabla';
        this.documentos_visualizar.forEach((item) => {
          if (item.parametros_indexados_values && typeof item.parametros_indexados_values === 'string') {
            try { item.metadatos = JSON.parse(item.parametros_indexados_values); } catch { item.metadatos = []; }
          } else { item.metadatos = item.parametros_indexados_values || []; }
        });
        this.cdr.detectChanges();
        Swal.close();
      },
      error: () => { Swal.close(); this.toast.error('Error al cargar documentos'); }
    });
  }

  buscarDocumentos() { this.buscar(1); }

  toggleSeleccion(doc: any) {
    this.seleccionarDocumentoParaCert(doc);
    const idDocTarget = doc.id_documento || doc.id;
    const index = this.documentos_seleccionados.findIndex(d => (d.id_documento || d.id) === idDocTarget);
    if (index > -1) {
      this.documentos_seleccionados.splice(index, 1);
    } else {
      this.documentos_seleccionados.push({
        id_documento: idDocTarget,
        nombre_archivo: doc.nombre_archivo || doc.text || 'Archivo sin nombre',
        serie: doc.serie || null,
        nombre_serie: doc.nombre_serie || null,
        caja: doc.caja || doc.nro_caja || null,
        carpeta: doc.carpeta || null,
        descripcion: doc.descripcion || null,
        fojas: doc.fojas || 0
      });
    }
    this.cdr.detectChanges();
  }

  estaSeleccionado(doc: any): boolean {
    const idDocTarget = doc.id_documento || doc.id;
    return this.documentos_seleccionados.some(d => (d.id_documento || d.id) === idDocTarget);
  }

  buscarUsuario() {
    if (!this.id_empresa) { this.toast.error('No hay un ID de empresa asignado.'); return; }
    if (!this.search_user || this.search_user.trim() === '') { this.toast.info('Por favor, ingrese un nombre o cédula.'); return; }
    this.certificadoService.buscarusuario(this.id_empresa, this.search_user).subscribe({
      next: (resp: any) => {
        if (resp && resp.usuarios && resp.usuarios.length > 0) {
          this.usuarios_list = resp.usuarios; 
          this.toast.success(`${resp.usuarios.length} coincidencias encontradas`);
        } else { this.usuarios_list = []; this.toast.error('No se encontró ningún usuario'); }
        this.cdr.detectChanges();
      }
    });
  }

  buscarTramite() {
    if (!this.id_empresa || !this.numero_tramite?.trim()) { this.toast.info('Ingrese un número de trámite para buscar'); return; }
    this.certificadoService.buscarTramitePorNumero(this.id_empresa, this.numero_tramite.trim()).subscribe({
      next: (resp: any) => {
        if (resp?.status === 200 && Array.isArray(resp.tramites)) {
          const n = resp.tramites.length;
          if (n === 1) { this.id_tramite = resp.tramites[0].id_tramite ?? null; this.toast.success('Trámite encontrado y asignado'); }
          else if (n > 1) { this.id_tramite = null; this.toast.info(`Se encontraron ${n} coincidencias. Refine el número para asignar automáticamente.`); this.numero_tramite = ''; }
          else { this.id_tramite = null; this.toast.info('No se encontraron trámites con ese número'); this.numero_tramite = ''; }
        } else { this.id_tramite = null; this.toast.info('No se encontraron trámites con ese número'); this.numero_tramite = ''; }
        this.cdr.detectChanges();
      },
      error: () => { this.toast.error('Error al buscar trámite'); this.id_tramite = null; this.numero_tramite = ''; this.cdr.detectChanges(); }
    });
  }

  seleccionarUsuario(user: any) {
    this.usuario_selected = user; 
    this.PRESTAMO_SELECTED.solicitante = user;
    (this.PRESTAMO_SELECTED as any).solicitante_full_name = `${user.name} ${user.surname}`;
    this.usuarios_list = [];      
    this.search_user = '';
    this.cdr.detectChanges();
  }

  verDocumentoActual() {
    const modalRef = this.modalService.open(VerCertificadoComponent, { centered: true, size: 'xl', backdrop: 'static' });
    (modalRef.componentInstance as any).id_certificacion = this.id_certificacion;
    (modalRef.componentInstance as any).id_empresa = this.id_empresa;  
    (modalRef.componentInstance as any).data = {
      observacion: this.observacion,
      usuario_selected: this.usuario_selected,
      documentos: this.documentos_seleccionados
    };
  }

  grabarBorrador() {
    if (!this.usuario_selected) { this.toast.error('Debe seleccionar un usuario solicitante'); return; }
    if (this.documentos_seleccionados.length === 0) { this.toast.error('Debe seleccionar al menos un documento'); return; }
    const userData = localStorage.getItem('user');
    if (!userData) { this.toast.error('Sesión caducada, por favor inicie sesión nuevamente'); return; }
    const userLocal = JSON.parse(userData);
    this.isLoading = true;
    const documentosIds = this.documentos_seleccionados.map((doc: any) => doc.id_documento || doc.id).filter((id: any) => id != null);
    const dataActa = {
        id_empresa: this.id_empresa,
        id_usuario_solicitante: this.usuario_selected.id,
        id_usuario_responsable: userLocal.id,
        documentos_ids: documentosIds, 
        observaciones: this.observacion, 
        numero_acta: this.PRESTAMO_SELECTED?.numero_acta || null, 
        id_tramite: this.id_tramite ?? null,
        numero_tramite: this.numero_tramite ? this.numero_tramite.trim() : null,
        // Enviamos fecha límite en el mismo campo usado en creación (frontend)
        fecha_devolucion: this.fecha_limite_form || null,
        modo: 0,
        tipo_certificacion: 'CERTIFICACION'
    };
    this.certificadoService.guardarBorradorCertificacion(dataActa).subscribe({
        next: (resp: any) => {
            this.isLoading = false;
            if (resp.status === 200) {
                this.toast.success('Borrador guardado correctamente.');
                this.PrestamoE.emit(resp.acta); 
                this.cdr.detectChanges();
            } else { this.toast.error(resp.message || 'Error al guardar el borrador'); }
        },
        error: (err) => { this.isLoading = false; this.toast.error('Error de servidor al procesar el borrador'); this.cdr.detectChanges(); }
    });
  }

  CrearActa() {
      const userData = localStorage.getItem('user');
      if (!userData) { this.toast.error('Sesión caducada, inicie sesión nuevamente'); return; }
      const userLocal = JSON.parse(userData);
      const payload = { id_empresa: this.id_empresa, id_certificacion: this.id_certificacion, id_usuario: userLocal.id };
      if (!payload.id_certificacion) { this.toast.error('No se detectó un ID de certificación válido'); return; }
      Swal.fire({
          title: '¿Está seguro de firmar y crear el acta?',
          text: 'Una vez firmado electrónicamente, este proceso es irreversible y no se podrá dar marcha atrás.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#1a365d',
          cancelButtonColor: '#718096',
          confirmButtonText: 'Sí, firmar y generar',
          cancelButtonText: 'Cancelar',
          heightAuto: false
      }).then((result) => {
          if (result.isConfirmed) {
              this.isLoading = true;
              this.certificadoService.registrarCertificacion(payload).subscribe({
                  next: (resp: any) => {
                      this.isLoading = false;
                      if (resp.status === 200) {
                          Swal.fire({ title: '¡Acta Firmada!', text: resp.message || 'El acta ha sido generada y firmada digitalmente de forma correcta.', icon: 'success', confirmButtonColor: '#1a365d', heightAuto: false }).then(() => {
                              this.PrestamoE.emit(resp.data || true);
                              this.activeModal.close(resp.data || true);
                          });
                      } else {
                          Swal.fire({ title: 'No se pudo firmar', text: resp.message || 'Error al procesar el acta', icon: 'error', confirmButtonColor: '#e53e3e', heightAuto: false });
                      }
                  },
                  error: (err) => {
                      this.isLoading = false;
                      const errorMsg = err.error?.message || 'Error de comunicación con el servidor';
                      Swal.fire({ title: 'Error de Servidor', text: errorMsg, icon: 'error', confirmButtonColor: '#e53e3e', heightAuto: false });
                  }
              });
          }
      });
  }
}
