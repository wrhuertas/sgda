import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { UsuarioAreaComponent } from '../../Recepcion/usuario-area/usuario-area.component';
import { AsignartramiteService } from '../service/asignartramite.service';
import { firstValueFrom } from 'rxjs';
import { VerTramiteComponent } from '../ver-tramite/ver-tramite.component';
import { URL_SERVICIOS, URL_BACKEND } from 'src/app/config/config';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { HttpClient } from '@angular/common/http';
import htmlToPdfmake from 'html-to-pdfmake';
import pdfMake from 'pdfmake';
import { BuscarUsuarioComponent } from '../buscar-usuario/buscar-usuario.component';
import { SeguimientoComponent } from '../seguimiento/seguimiento.component';
import { RegistrarService } from '../../RegistrarTramite/service/registrar.service';

import Swal from 'sweetalert2';
import { VistaPreviaComponent } from '../vista-previa/vista-previa.component';
import { AnexosSumillarComponent } from '../anexos-sumillar/anexos-sumillar.component';
import { VistaActaComponent } from '../vista-acta/vista-acta.component';

@Component({
  selector: 'app-registrar-asignacion',
  templateUrl: './registrar-asignacion.component.html',
  styleUrls: ['./registrar-asignacion.component.scss']
})
export class RegistrarAsignacionComponent {


  @Input() id_usuario: any;
  @Input() id_tramite!: number;
  @Input() id_asignacion?: number;

  /**
   * Raíz del hilo cuando no hay trámite (creado por memorandum).
   * Cumple el papel que tiene id_tramite en los trámites normales.
   */
  @Input() id_asignacion_padre?: number;
@Input() tramiteDatos!: any;
@Output() tramiteC = new EventEmitter<void>();
@Input() areas: any[] = [];
  fechaRegistro = new Date().toLocaleDateString();
  accion: string = 'DERIVAR';

  areaOrigen: string = '';
  areaDestino: number | null = null;

  descripcion: string = '';
 archivos: File[] = [];
 anexosDescripcion: string[] = [];
usuarioDestinoNombre: string = '';

usuariosSeleccionadosEnPadre: { id: number, nombre: string }[] = []; 
  documentosTramite: any[] = [];
  anexosGuardados: any[] = [];
  actaData: any = null;
  // Coordenadas del sello de sumilla (fracciones respecto a la imagen) capturadas en la vista del acta
  sumillaCoords: any = null;
id_empresa: number | null = null;
usuario_id: number | null = null;

secciones: any[] = [];
subsecciones: any[] = [];
subsubsecciones: any[] = [];

id_seccion: any = null;
id_subseccion: any = null;
id_subsubseccion: any = null;

public tab_active: number = 1;
public nombre_tipo_documento: string = 'Memorando';
public numeroMemorandum: string = '';
public numeroMemorandumCompleto: string = '';


listaFuncionarios: any[] = [
  { id: 1, nombre: 'Juan Pérez', cargo: 'Director Técnico' },
  { id: 2, nombre: 'María García', cargo: 'Analista de Trámites' },
  { id: 3, nombre: 'Ricardo Valencia', cargo: 'Sistemas' }
];

funcionariosPara: any[] = [];
funcionariosCC: any[] = [];
funcionariosDe: any[] = [];

rucOrganizacion: string = '';
nombreOrganizacion: string = '';
tipoPersona: string = '';
asunto: string = '';


  public Editor: any = ClassicEditor; 
  
  public contenidoCuerpo: string = '';
  guardando: boolean = false;
  private editorInstance: any = null;

  public editorConfig = {
    toolbar: [
      'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
      'indent', 'outdent', '|', 'insertTable', 'undo', 'redo'
    ]
  };



  comentarioAdicional: string = '';

  usuarios_para: any[] = [];
  usuarios_de: any[] = [];
  usuarios_copia: any[] = [];
  // Indica si el backend debe firmar el acta al asignar (según validación de firma)
  private firmarActaEnAsignacion: boolean = false;
  
  // Checkbox para finalizar trámite
  finalizarTramite: boolean = false;
  
  // Checkbox para rechazar trámite
  rechazarTramite: boolean = false;

  // Checkbox para marcar sumillar (sin comportamiento por ahora)
  sumillar: boolean = false;
  textoSumillar: string = '';

  // True si el trámite abierto ya viene sumillado (sumilla = 1)
  get esSumillado(): boolean {
    return Number(this.tramiteDatos?.asignacion?.sumilla) === 1;
  }

  /**
   * True si el usuario logueado es subdirector.
   * Sumillar, rechazar y finalizar son decisiones del director: al subdirector
   * no se le muestran esas tres opciones.
   */
  get esSubdirector(): boolean {
    const user = this.authService?.currentUserValue
      ?? JSON.parse(localStorage.getItem('user') || '{}');

    return Number((user as any)?.subdirector) === 1;
  }

  onSumillarChange() {
    if (this.sumillar) {
      // Al activar sumillar: precargar los datos del propio trámite
      // Asunto
      const asuntoTramite = this.tramiteDatos?.asignacion?.asunto_asignar
        ?? this.tramiteDatos?.tramite?.asunto
        ?? this.tramiteDatos?.asunto
        ?? '';
      if (asuntoTramite) this.asunto = asuntoTramite;

      // Tipo de documento
      const idTipoDoc = this.tramiteDatos?.asignacion?.id_tipo_documento
        ?? this.tramiteDatos?.id_tipo_documento
        ?? null;
      if (idTipoDoc) this.id_tipo_documento_sel = idTipoDoc;

      // Tipo de trámite
      const idTipoTram = this.tramiteDatos?.asignacion?.id_tipo_tramite
        ?? this.tramiteDatos?.id_tipo_tramite
        ?? null;
      if (idTipoTram) this.id_tipo_tramite_sel = idTipoTram;

      // Texto a sumillar por defecto si está vacío
      if (!this.textoSumillar || String(this.textoSumillar).trim() === '') {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        this.textoSumillar = `Revisar ${dd}/${mm}/${yyyy}`;
      }
    } else {
      // Al desactivar: volver a lo normal (Memorando y asunto vacío)
      const mem = this.tipo_documentos.find((td: any) => String(td?.nombre || '').toLowerCase().includes('memor'));
      if (mem && mem.id_tipodocumento) this.id_tipo_documento_sel = mem.id_tipodocumento;
      this.asunto = '';
    }
    this.cdr.detectChanges();
  }

  // Carga inicial con Swal
  private initPending: number = 0;
  private initLoadingShown: boolean = false;

  private showInitLoading() {
    if (this.initLoadingShown) return;
    this.initLoadingShown = true;
    try {
      Swal.fire({
        title: 'Cargando datos',
        html: 'Por favor, espere un momento... ',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
    } catch {}
  }

  private incInit() {
    this.initPending++;
    this.showInitLoading();
  }

  private decInit() {
    this.initPending = Math.max(0, this.initPending - 1);
    if (this.initPending === 0 && this.initLoadingShown) {
      try { Swal.close(); } catch {}
      this.initLoadingShown = false;
    }
  }


  constructor(public activeModal: NgbActiveModal,


   //  public AsignartramiteService: AsignartramiteService,
     public AsignartramiteService: AsignartramiteService,
     public toast: ToastrService,
         private cdr: ChangeDetectorRef,
         public authService: AuthService,
          public modalService: NgbModal,
           private http: HttpClient,
          private registrarService: RegistrarService,
   ) {}

  ngOnInit() {
    // Iniciar indicador de carga inicial
    this.showInitLoading();
    const user = this.authService.user;
    
    if (user) {
      this.id_empresa = user.id_empresa;
      this.usuario_id = user.id;
      console.log('ID Empresa cargado:', this.id_empresa);
       this.incInit();
       this.DatosLogeado(user.id);
    }
      // Mantener asunto vacío al abrir el modal (no precargar del trámite)
      this.asunto = '';
      // Inicializar editor con el cuerpo del trámite si existe
      const cuerpoDocumento = this.tramiteDatos?.cuerpo_documento || this.tramiteDatos?.tramite?.cuerpo_documento;
      if (cuerpoDocumento && String(cuerpoDocumento).trim() !== '') {
        this.contenidoCuerpo = cuerpoDocumento;
      } else if (!this.contenidoCuerpo) {
        this.contenidoCuerpo = '<p>De mi consideración:</p><p>&nbsp;</p><p>Con sentimientos de distinguida consideración.</p>';
      }
      this.setUsuarioDeFijo();
      console.log('ID TRÁMITE RECIBIDO:', this.id_tramite);
      console.log('ACCIÓN INICIAL:', this.accion);

      console.log('Trámite completo recibido:', this.tramiteDatos);

      console.log('Campos del objeto:', Object.keys(this.tramiteDatos));

      console.log('ID AREA ORIGEN:', this.tramiteDatos?.asignacion?.id_area_origen);
      console.log('ID USUARIO ORIGEN:', this.tramiteDatos?.usuario_origen?.id);
      console.log('ID AREA DESTINO:', this.tramiteDatos?.asignacion?.id_area_destino);
      console.log('ID USUARIO DESTINO:', this.tramiteDatos?.usuario_destino?.id);

      // La categoría se lee acá y no sólo dentro de documentostramite(): los
      // trámites creados por memorandum no tienen trámite, esa función no se
      // ejecuta, y la categoría quedaba sin leer aunque estuviera guardada en
      // la asignación. Sin ella los tres selects nunca se ocultaban.
      this.categoria_sel = this.valorDelTramite('categoria') || '';
      this.categoriaPrecargada = !!this.categoria_sel;

      this.incInit();
      // Cargar documentos del trámite
      const idTramite = this.id_tramite || this.tramiteDatos?.asignacion?.id_tramite || this.tramiteDatos?.id_tramite;
      if (idTramite) {
        this.documentostramite(idTramite);
      }
      // Traer datos del logueado para enriquecer fila "De"
      if (this.usuario_id) {
        this.DatosLogeado(this.usuario_id);
      }
      // Cargar tipos de documento y de trámite para selects
      if (this.id_empresa) {
        this.cargarTipos(this.id_empresa);
      }

      // Regla: si es original (no borrador) y ya existen 2 o más registros con el mismo número, ocultar Asignar
      const esOriginal = !this.tramiteDatos?.es_borrador && !this.tramiteDatos?.estado_borrador;
      const idTram = this.id_tramite;
      if (esOriginal && idTram) {
        this.incInit();
        this.AsignartramiteService.contarPorNumeroTramite({ id_tramite: idTram }).subscribe({
          next: (res: any) => {
            const count = Number(res?.count || 0);
            this.puedeAsignar = count < 2;
            this.cdr.detectChanges();
            this.decInit();
          },
          error: () => {
            this.puedeAsignar = true;
            this.decInit();
          }
        });
      }
        // Por si no hubo ninguna llamada pendiente (caso borde)
        setTimeout(() => {
          // Restaurar numero_documento_input si fue guardado
          if (this.numeroDocumentoInicial && !this.numero_documento_input) {
            this.numero_documento_input = this.numeroDocumentoInicial;
            this.cdr.detectChanges();
          }
          this.decInit();
        }, 0);

        // Inicializar textoSumillar con la fecha de hoy si está vacío
        if (!this.textoSumillar || String(this.textoSumillar).trim() === '') {
          const d = new Date();
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          this.textoSumillar = `Revisar ${dd}/${mm}/${yyyy}`;
        }

        // Log del id de asignación recibido (si se pasó)
        try {
          console.log('RegistrarAsignacionComponent - id_asignacion recibido:', this.id_asignacion);
        } catch {}

      this.traerActa()
   }

  traerActa()
   {
     try {
       const id = this.id_asignacion ?? this.tramiteDatos?.asignacion?.id_asignacion_tramite ?? this.tramiteDatos?.asignacion?.id;
       console.log('traerActa - id a enviar al servicio:', id);
       if (!id) {
         console.warn('traerActa: no se encontró id_asignacion para enviar');
         return;
       }
       this.incInit();
        this.AsignartramiteService.traerActaAsignacion(Number(id)).subscribe({
          next: (resp: any) => {
            console.log('traerActa - respuesta del servicio:', resp);
            // Guardar la respuesta para que verActa pueda enviarla al modal
            this.actaData = resp;
          },
         error: (err: any) => {
           console.error('traerActa - error al llamar al servicio:', err);
         },
         complete: () => this.decInit()
       });
     } catch (e) {
       console.error('traerActa - error inesperado:', e);
     }
   }


    verActa(){
     console.log('verActa() llamado desde plantilla');

     // Validación: no permitir ver el acta si no hay un usuario "Para" seleccionado
     if (!this.usuarios_para || this.usuarios_para.length === 0) {
       this.toast.warning('Debe seleccionar un usuario "Para" antes de ver el acta.');
       return;
     }

     const modalRef = this.modalService.open(VistaActaComponent, {
    centered: true,
    size: 'xl',
    backdrop: 'static'
  });

    try {
      modalRef.componentInstance.actaData = this.actaData;
      try { modalRef.componentInstance.textoSumillar = this.textoSumillar; } catch {}
      try { modalRef.componentInstance.usuariosDe = this.usuarios_de; } catch {}
      try { modalRef.componentInstance.usuariosPara = this.usuarios_para; } catch {}
      // Restaurar la posición del sello donde el usuario lo dejó la última vez
      try { modalRef.componentInstance.overlayInicial = this.sumillaCoords; } catch {}
    } catch (e) {
      // El componente destino puede no exponer la propiedad; ignorar en ese caso
    }

    // Al cerrar, la vista del acta devuelve la posición del sello (fracciones)
    modalRef.result.then((coords: any) => {
      if (coords && typeof coords === 'object') {
        this.sumillaCoords = coords;
        console.log('Coordenadas del sello recibidas:', coords);
      }
    }).catch(() => {});
   }

  tipo_documentos: any[] = [];
   tipo_tramites: any[] = [];
   id_tipo_documento_sel: any = null;
   id_tipo_tramite_sel: any = null;
   categoria_sel: string = '';
   numero_documento_input: string = '';
   puedeAsignar: boolean = true;
   private numeroDocumentoInicial: string = '';

   // Indican si el valor ya vino cargado de la asignación anterior o de la base.
   tipoDocumentoPrecargado: boolean = false;
   tipoTramitePrecargado: boolean = false;
   categoriaPrecargada: boolean = false;

   // Los tres selects se ocultan/muestran juntos: sólo se ocultan cuando los
   // tres datos ya vienen cargados; si falta alguno se muestran los tres.
   get selectsPrecargados(): boolean {
     return this.tipoDocumentoPrecargado && this.tipoTramitePrecargado && this.categoriaPrecargada;
   }

   // `tramiteDatos` es el item del listado: { asignacion, tramite, ... }
   private valorDelTramite(campo: string): any {
     return this.tramiteDatos?.asignacion?.[campo]
       ?? this.tramiteDatos?.tramite?.[campo]
       ?? this.tramiteDatos?.[campo]
       ?? null;
   }

  private cargarTipos(idEmpresa: number) {
    // Tipos de documento
    this.incInit();
    this.registrarService.configtipo(idEmpresa).subscribe({
      next: (resp: any) => {
        const arr = resp?.tipo_documentos || resp?.data || resp || [];
        this.tipo_documentos = Array.isArray(arr) ? arr : [];
        // Si la asignación anterior ya trae tipo de documento, se respeta
        const idTipoDocPrevio = this.valorDelTramite('id_tipo_documento');
        if (idTipoDocPrevio) {
          this.id_tipo_documento_sel = idTipoDocPrevio;
          this.tipoDocumentoPrecargado = true;
        } else {
          // Por defecto queda seleccionado "Memorando/Memorandum"
          const mem = this.tipo_documentos.find((td: any) => String(td?.nombre || '').toLowerCase().includes('memor'));
          if (mem && mem.id_tipodocumento) {
            this.id_tipo_documento_sel = mem.id_tipodocumento;
          }
          this.tipoDocumentoPrecargado = false;
        }
        this.cdr.detectChanges();
        this.decInit();
      },
      error: () => { this.tipo_documentos = []; this.decInit(); }
    });
    // Tipos de trámite
    this.incInit();
    this.registrarService.configtipotramite(idEmpresa).subscribe({
      next: (resp: any) => {
        const arr = resp?.tipo_tramites || resp?.data || resp || [];
        this.tipo_tramites = Array.isArray(arr) ? arr : [];
        // El id viene anidado en asignacion/tramite, no en la raíz de tramiteDatos
        const idTipoTramPrevio = this.valorDelTramite('id_tipo_tramite');
        this.id_tipo_tramite_sel = idTipoTramPrevio ?? this.id_tipo_tramite_sel;
        this.tipoTramitePrecargado = !!idTipoTramPrevio;
        this.cdr.detectChanges();
        this.decInit();
      },
      error: () => { this.tipo_tramites = []; this.decInit(); }
    });
  }

  onTipoDocumentoChange(id: any) {
    try {
      const td = this.tipo_documentos.find((t: any) => String(t?.id_tipodocumento) === String(id));
      const nombre = String(td?.nombre || '').toLowerCase();
      
      // Solo bloquear OFICIO si accion es DERIVAR
      if (nombre.includes('oficio') && this.accion === 'DERIVAR') {
        // Mostrar advertencia y revertir a Memorando
        this.toast.warning('Este trámite no puede ser Oficio');
        const mem = this.tipo_documentos.find((x: any) => String(x?.nombre || '').toLowerCase().includes('memor'));
        if (mem && mem.id_tipodocumento) {
          this.id_tipo_documento_sel = mem.id_tipodocumento;
          this.cdr.detectChanges();
        }
      }
    } catch {}
  }

    DatosLogeado(id_usuario: number): void {
      try {
        console.log('validarFirma - id_usuario (enviando al servicio):', id_usuario);
        this.AsignartramiteService.datosLogeado(id_usuario).subscribe({
          next: (resp: any) => {
            console.log('Logeado:', resp);
            // Enriquecer la fila DE si existe
            if (Array.isArray(this.usuarios_de) && this.usuarios_de.length > 0 && resp) {
              const de = this.usuarios_de[0];
              // Mapear campos si existen en respuesta
              if (typeof resp.tiene_firma !== 'undefined') de.tiene_firma = !!resp.tiene_firma;
              if (resp.titulo_usuario) de.titulo = resp.titulo_usuario;
              // Usamos 'area' y 'subseccion' que la tabla ya muestra
              if (resp.proyecto_actual) de.area = resp.proyecto_actual; // sección actual
              if (resp.nombre_proyecto_raiz) de.subseccion = resp.nombre_proyecto_raiz; // subsección/raíz
              if (resp.empresa) de.institucion = resp.empresa;
              // Sigla opcional del usuario
              if (resp.sigla_usuario) de.sigla = resp.sigla_usuario;

              // Autogenerar Número de Documento con: SIGLA_EMPRESA-SIGLA_PROYECTO_RAIZ-SIGLA_PROYECTO_ACTUAL-AÑO-####-M
              const siglaEmp = String(resp.sigla || resp.sigla_empresa || '').trim();
              const siglaProyRaiz = String(resp.sigla_proyecto_raiz || '').trim();
              const siglaProyActual = String(resp.sigla_proyecto_actual || '').trim();
              const year = new Date().getFullYear();
              const idEmp = this.id_empresa ?? resp.id_empresa ?? null;

              // Armamos el PREFIJO (todo menos el secuencial y el "-M")
              // Ejemplo resultante: "GADM-COG-2026" o "GADM-FIN-2026"
              const partesPrefijo: string[] = [];
              if (siglaEmp) partesPrefijo.push(siglaEmp);
              if (siglaProyRaiz) partesPrefijo.push(siglaProyRaiz);
              // Solo agregar la sigla del proyecto actual si es distinta de la raíz
              // (evita duplicar cuando el usuario está en un proyecto que es la propia raíz)
              if (siglaProyActual && siglaProyActual !== siglaProyRaiz) partesPrefijo.push(siglaProyActual);
              partesPrefijo.push(String(year));
              const prefijo = partesPrefijo.join('-');

              if (idEmp && prefijo) {
                this.AsignartramiteService.getSecuencialMemorandumRecepcion(Number(idEmp), prefijo).subscribe({
                  next: (r: any) => {
                    const sec4 = String(r?.secuencial || '0001').padStart(4, '0');
                    this.numero_documento_input = `${prefijo}-${sec4}-M`;
                    this.cdr.detectChanges();
                  },
                  error: (err) => {
                    console.error('getSecuencialMemorandumRecepcion - error:', err);
                    this.numero_documento_input = `${prefijo}-0001-M`;
                    this.cdr.detectChanges();
                  }
                });
              } else {
                // Si falta id_empresa o prefijo, generamos con secuencial por defecto
                this.numero_documento_input = `${prefijo || 'SIN-PREFIJO'}-0001-M`;
                this.cdr.detectChanges();
              }
            }
          },
          error: (err) => {
            console.error('validarFirma - error servicio:', err);
          },
          complete: () => this.decInit()
        });
      } catch (e) {
        console.error('DatosLogeado - error:', e);
        this.decInit();
      }
    }


  onEditorReady(editor: any) {
    this.editorInstance = editor;
    // Sincronizar contenido inicial explícitamente
    try { this.editorInstance.setData(this.contenidoCuerpo || ''); } catch {}
  }

  private setEditorDataSafely(data: string) {
    this.contenidoCuerpo = data || '';
    if (this.editorInstance && typeof this.editorInstance.setData === 'function') {
      try { this.editorInstance.setData(this.contenidoCuerpo); } catch {}
    }
    this.cdr.detectChanges();
  }

  // Arma un resumen automático en el cuerpo cuando el trámite trae anexos:
  // cuántos elementos son y de qué trámite vienen.
  private generarResumenDeAnexosGuardados(): void {
    if (!this.anexosGuardados || this.anexosGuardados.length === 0) {
      return;
    }

    // Contar tipos de elementos
    let carpetas = 0;
    let cds = 0;
    let documentos = 0;

    this.anexosGuardados.forEach(ax => {
      const nombre = (ax?.nombre_anexo || '').toLowerCase();

      if (nombre.includes('carpeta')) {
        carpetas++;
      } else if (nombre.includes('cd') || nombre.includes('dvd')) {
        cds++;
      } else {
        documentos++;
      }
    });

    // Construir el texto de cantidad de elementos
    let elementosTexto = '';
    const partes: string[] = [];

    if (documentos > 0) partes.push(`${documentos} documento${documentos > 1 ? 's' : ''}`);
    if (carpetas > 0) partes.push(`${carpetas} carpeta${carpetas > 1 ? 's' : ''}`);
    if (cds > 0) partes.push(`${cds} cd${cds > 1 ? 's' : ''}`);

    if (partes.length > 0) {
      elementosTexto = partes.join(' y ');
    } else {
      elementosTexto = `${this.anexosGuardados.length} archivo(s)`;
    }

    // Obtener datos del trámite
    const numeroTramite = this.valorDelTramite('numero_tramite')
      || this.valorDelTramite('num_documento_interno')
      || 'N/A';
    const cliente = this.tramiteDatos?.cliente?.nombre || this.tramiteDatos?.cliente_nombre || 'N/A';
    const asunto = this.tramiteDatos?.tramite?.asunto || this.asunto || 'el trámite';

    // Generar el resumen con formato formal
    const resumen = `<p>Me permito entregar el documento original más ${elementosTexto} referente al Trámite Nº ${numeroTramite} ${cliente} ${asunto}, para su respectiva gestión.</p>`;

    // Si el contenido actual no tiene "Me permito", agregarlo automáticamente
    if (!this.contenidoCuerpo.includes('Me permito')) {
      this.setEditorDataSafely(
        '<p>De mi consideración:</p><p>&nbsp;</p>' + resumen + '<p>&nbsp;</p><p>Con sentimientos de distinguida consideración.</p>'
      );
    }
  }

  // Mostrar solo el número de referencia sin sufijo (p. ej. sin "-VAC")
  get referenciaDisplay(): string {
    const base = String(this.tramiteDatos?.asignacion?.num_documento_interno || '').trim();
    if (!base) return '';
    return base;
  }

  // Ya no se requieren iniciales para la referencia


verTramiteCompleto() {
  console.log("Abriendo detalle del trámite ID:", this.id_tramite);
  
  const modalRef = this.modalService.open(VerTramiteComponent, {
    centered: true,
    size: 'xl',
    backdrop: 'static'
  });

  modalRef.componentInstance.id_usuario = this.id_usuario;
  modalRef.componentInstance.id_empresa = this.id_empresa;
  modalRef.componentInstance.id_tramite = this.id_tramite;

  modalRef.componentInstance.tramiteDatos = this.tramiteDatos;

  modalRef.componentInstance.documentos = this.documentosTramite;

  modalRef.result.then((result) => {
    console.log('Modal ver trámite cerrado');
  }).catch((error) => {
  });
}


   documentostramite(id_tramite: number) {
    // Traer documentos del trámite (borrador/oficial según backend)
    this.AsignartramiteService.docuemntosTramite(id_tramite).subscribe({
      next: (resp: any) => {
        const tramite = resp.tramite || resp; // Ajusta según la estructura exacta de tu respuesta
        this.categoria_sel = tramite.categoria || this.valorDelTramite('categoria') || '';
        // Si la categoría ya viene de la base, se oculta el select
        this.categoriaPrecargada = !!this.categoria_sel;
        // Documentos
        this.documentosTramite = Array.isArray(resp?.documentos) ? resp.documentos : [];
        // Anexos en tabla anexos_tramite
        this.anexosGuardados = Array.isArray(resp?.anexos) ? resp.anexos : [];

        // Generar resumen dinámico basado en los anexos guardados
        if (this.anexosGuardados && this.anexosGuardados.length > 0) {
          this.generarResumenDeAnexosGuardados();
        }
  
        // Usuarios borrador (cuando estado_borrador = 1)
        const usuarios = Array.isArray(resp?.usuarios_borrador) ? resp.usuarios_borrador : [];
        if (usuarios.length > 0) {
          this.usuarios_para = usuarios.filter((u: any) => (u.rol_envio || u.tipo_rol) === 'PARA');
          this.usuarios_copia = usuarios.filter((u: any) => (u.rol_envio || u.tipo_rol) === 'COPIA');
          this.usuarios_de = usuarios.filter((u: any) => (u.rol_envio || u.tipo_rol) === 'DE');
        }
  
        this.cdr.detectChanges();
        this.decInit();
      },
      error: () => {
        this.documentosTramite = [];
        this.anexosGuardados = [];
        this.toast.error('No se pudo cargar los documentos');
        this.decInit();
      }
    });
  }



  onFilesSelected(event: any) {
    const files: FileList | null = event?.target?.files || null;
    if (!files || files.length === 0) return;

    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
    const allowedExt = ['pdf','doc','docx','xls','xlsx','jpg','jpeg','png','gif'];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const name = (f.name || '').toLowerCase();
      const ext = name.split('.').pop() || '';

      if (!allowedExt.includes(ext)) {
        this.toast.warning(`Formato no permitido: ${f.name}`);
        continue;
      }

      if (f.size > MAX_SIZE) {
        this.toast.warning(`El archivo supera 50 MB: ${f.name}`);
        continue;
      }

      this.archivos.push(f);
      this.anexosDescripcion.push('');
    }

    // limpiar input para permitir volver a seleccionar el mismo archivo
    event.target.value = '';
  }

  // Utilidades de presentación de archivos
  private getExt(file: File): string {
    const name = (file?.name || '').toLowerCase();
    const ext = name.includes('.') ? name.substring(name.lastIndexOf('.') + 1) : '';
    return ext;
  }

  getFileColor(file: File): string {
    const ext = this.getExt(file);
    if (ext === 'pdf') return 'text-danger';
    if (ext === 'doc' || ext === 'docx') return 'text-primary';
    if (ext === 'xls' || ext === 'xlsx') return 'text-success';
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif') return 'text-warning';
    return 'text-gray-500';
  }

  getFileBadgeClass(file: File): string {
    const ext = this.getExt(file);
    if (ext === 'pdf') return 'badge-light-danger';
    if (ext === 'doc' || ext === 'docx') return 'badge-light-primary';
    if (ext === 'xls' || ext === 'xlsx') return 'badge-light-success';
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif') return 'badge-light-warning';
    return 'badge-light';
  }

  getFileLabel(file: File): string {
    const ext = this.getExt(file).toUpperCase();
    if (!ext) return 'FILE';
    return ext;
  }

  verAnexoGuardado(anexo: any) {
    if (!anexo || !anexo.ruta) return;
    const url = `${URL_SERVICIOS}/storage/${anexo.ruta}`;
    window.open(url, '_blank');
  }

  removeFile(index: number) {
  this.archivos.splice(index, 1);
  this.anexosDescripcion.splice(index, 1);
}

  async onFinalizarChange() {
    if (this.finalizarTramite) {
      const result = await Swal.fire({
        title: '¿Está seguro?',
        text: '¿Desea finalizar este trámite?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, finalizar',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        this.accion = 'FINALIZAR';
        // Al finalizar no aplican sumillar ni rechazar
        this.rechazarTramite = false;
        this.sumillar = false;
        console.log('ACCIÓN CAMBIADA A:', this.accion);
      } else {
        this.finalizarTramite = false;
      }
    } else {
      const result = await Swal.fire({
        title: '¿Está seguro?',
        text: '¿Ya no desea finalizar este trámite?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        this.accion = 'DERIVAR';
        console.log('ACCIÓN CAMBIADA A:', this.accion);

        // Cambiar automáticamente a MEMORANDO cuando se cancela finalización
        const mem = this.tipo_documentos.find((x: any) => String(x?.nombre || '').toLowerCase().includes('memor'));
        if (mem && mem.id_tipodocumento) {
          this.id_tipo_documento_sel = mem.id_tipodocumento;
          this.cdr.detectChanges();
        }
      } else {
        this.finalizarTramite = true;
      }
    }
  }

  async onRechazarChange() {
    if (this.rechazarTramite) {
      const result = await Swal.fire({
        title: '¿Está seguro?',
        text: '¿Desea rechazar este trámite?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, rechazar',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        this.accion = 'RECHAZAR';
        this.finalizarTramite = false; // Desactivar finalizar si se activa rechazar
        console.log('ACCIÓN CAMBIADA A:', this.accion);
        this.toast.success('Trámite rechazado');
      } else {
        this.rechazarTramite = false;
        this.toast.info('Rechazo cancelado');
      }
    } else {
      const result = await Swal.fire({
        title: '¿Está seguro?',
        text: '¿Ya no desea rechazar este trámite?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        this.accion = 'DERIVAR';
        console.log('ACCIÓN CAMBIADA A:', this.accion);
        this.toast.success('Rechazo cancelado');
      } else {
        this.rechazarTramite = true;
        this.toast.info('Acción cancelada');
      }
    }
  }

  async registrar() {
    // Debe esperarse: sin await, quien llama continúa antes de que termine
    // la generación del acta y el envío al servidor.
    await this.procederConRegistro();
  }

  private async procederConRegistro() {

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user || !user.id) {
      this.toast.error('Usuario no autenticado');
      return;
    }

    this.setUsuarioDeFijo();

    const destino = this.usuarios_para?.[0]?.id;
    // Al finalizar el trámite el destinatario es opcional
    if (!destino && !this.finalizarTramite) {
      this.toast.error('Falta el destinatario. Use "Buscar Usuario", agregue el usuario y en "Colocar como" seleccione "Para", luego "Asignar Usuarios".');
      return;
    }

    // Áreas ya no son requeridas según la nueva regla
    const areaOrigen = this.tramiteDatos?.id_area_origen ?? null;
    const areaDestino = this.areaDestino ?? this.tramiteDatos?.id_area_destino ?? null;

    if (this.guardando) return;
    this.guardando = true;

    try {
      // Sin parámetros: usa el número de memorándum y el tipo de documento actuales
      const actaFile = await this.generarActaPdfFile();

      const formData = new FormData();

      // Los trámites creados por memorandum no tienen trámite: va vacío
      formData.append('id_tramite', this.id_tramite?.toString() ?? '');
      // Sin trámite, esta es la raíz del hilo: hace el papel de id_tramite
      formData.append('id_asignacion_padre', this.id_asignacion_padre?.toString() ?? '');
      formData.append('id_asignacion_tramite', this.tramiteDatos?.asignacion?.id_asignacion_tramite?.toString() || '');
      // Enviar el estado de sumilla actual (si es 1, el backend lo pasa a 2 = revisada)
      formData.append('sumilla', String(this.tramiteDatos?.asignacion?.sumilla ?? 0));
      formData.append('accion', this.accion);
      formData.append('descripcion', this.descripcion ?? '');

      // No enviamos áreas; backend ya no las requiere según la nueva regla

      formData.append('id_usuario_origen', user.id.toString());
      // Puede no existir cuando se finaliza el trámite sin reenviarlo a nadie
      if (destino) formData.append('id_usuario_destino', destino.toString());

      // Instrucción al backend: firmar el acta si el usuario tiene firma vigente
      formData.append('firmar_acta', this.firmarActaEnAsignacion ? '1' : '0');
      if (this.firmarActaEnAsignacion && user?.id) {
        formData.append('id_usuario_firma', String(user.id));
      }

      // Posición exacta (mm) donde debe ir la firma visual: bajo "Atentamente,"
      if (this.posicionFirmaActa) {
        formData.append('firma_pagina', String(this.posicionFirmaActa.pagina));
        formData.append('firma_x_mm', String(this.posicionFirmaActa.x));
        formData.append('firma_y_mm', String(this.posicionFirmaActa.y));
      }

      // El acta va primero; su descripción viaja vacía para mantener alineados
      // los índices de 'archivos[]' con los de 'anexos_descripcion[]'.
      formData.append('archivos[]', actaFile);
      formData.append('anexos_descripcion[]', '');
      this.archivos.forEach((file, idx) => {
        formData.append('archivos[]', file);
        formData.append('anexos_descripcion[]', this.anexosDescripcion[idx] ?? '');
      });

      // Enviar también los destinatarios actuales para que el backend pueda
      // persistirlos/usar sin depender de un paso previo de "Guardar".
      // Formato compatible con los endpoints existentes (para[], copia[], de[])
      this.usuarios_de.forEach(u => formData.append('de[]', String(u.id)));
      this.usuarios_para.forEach(u => formData.append('para[]', String(u.id)));
      this.usuarios_copia.forEach(u => formData.append('copia[]', String(u.id)));

      // Ciudadanos destinatarios: se envía su id_cliente para que el backend
      // saque el correo de la ficha del cliente y le notifique.
      const idsClientes = [...(this.usuarios_para || []), ...(this.usuarios_copia || [])]
        .map((u: any) => u?.id_cliente)
        .filter((id: any) => !!id);
      Array.from(new Set(idsClientes)).forEach((id: any) => {
        formData.append('clientes_notificar[]', String(id));
      });

      // Enviar datos del formulario seleccionados
      if (this.id_tipo_documento_sel) formData.append('id_tipo_documento', String(this.id_tipo_documento_sel));
      if (this.id_tipo_tramite_sel) formData.append('id_tipo_tramite', String(this.id_tipo_tramite_sel));
      if (this.categoria_sel) formData.append('categoria', String(this.categoria_sel));
      const numDocInterno = this.numero_documento_input || this.numeroMemorandumCompleto;
      if (numDocInterno) formData.append('num_documento_interno', String(numDocInterno));
      if (this.referenciaDisplay) formData.append('numero_referido', String(this.referenciaDisplay));
      if (this.asunto) formData.append('asunto', String(this.asunto));
      if (this.contenidoCuerpo) formData.append('cuerpo_documento', String(this.contenidoCuerpo));

      // Ver en consola exactamente qué se está enviando al backend (FormData)
      console.log('procederConRegistro (confirmarAsignacion) - contenido del FormData:');
      formData.forEach((value, key) => {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name} (${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}:`, value);
        }
      });

      await firstValueFrom(this.AsignartramiteService.asginartramite(formData));
      this.toast.success('Trámite registrado correctamente');
      this.tramiteC.emit();
      this.activeModal.close();
    } catch (err) {
      this.toast.error('Error al registrar el trámite');
      console.error(err);
    } finally {
      this.guardando = false;
    }
}

// Posición (en mm) donde debe estamparse la firma visual: justo debajo de
// "Atentamente,". La calcula pdfMake al maquetar el acta.
private posicionFirmaActa: { pagina: number; x: number; y: number } | null = null;

// Convierte una URL de imagen a base64 (fallback cuando el backend no envía el base64)
private async urlABase64(url: string): Promise<string | null> {
  let finalUrl = String(url || '').trim();
  if (!finalUrl) return null;
  if (!/^https?:\/\//i.test(finalUrl)) {
    const base = String(URL_BACKEND || '').replace(/\/+$/, '');
    finalUrl = `${base}/${finalUrl.replace(/^\/+/, '')}`;
  }
  try {
    const blob = await firstValueFrom(this.http.get(finalUrl, { responseType: 'blob' }));
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Genera el acta en PDF con el MISMO diseño de la vista previa (logo, cabecera,
// pie de página, ciudad, destinatarios y anexos). El backend sólo guarda y firma
// este archivo, por eso todo el armado del documento vive aquí.
private async generarActaPdfFile(options?: { para?: any[]; de?: any[]; copia?: any[]; asunto?: string; numero_tramite?: string; tipo_documento?: string; borrador?: boolean }): Promise<File> {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const idEmpresa = user?.id_empresa ?? this.id_empresa ?? null;
  let empresa: any = null;
  let logoBase64: string | null = null;
  let cabeceraBase64: string | null = null;
  let pieBase64: string | null = null;

  if (idEmpresa) {
    try {
      empresa = await firstValueFrom(this.AsignartramiteService.cargarempresaidVistaPrevia(idEmpresa));
      // El endpoint ya devuelve las imágenes en base64 (evita el CORS de /storage)
      logoBase64 = empresa?.imagen_empresa_base64 ?? null;
      cabeceraBase64 = empresa?.imagen_cabecera_base64 ?? null;
      pieBase64 = empresa?.imagen_pie_pagina_base64 ?? null;

      // Fallback: si no vino el base64, descargar la imagen por URL
      if (!logoBase64 && empresa?.imagen_empresa) {
        logoBase64 = await this.urlABase64(empresa.imagen_empresa);
      }
      if (!cabeceraBase64 && empresa?.imagen_cabecera) {
        cabeceraBase64 = await this.urlABase64(empresa.imagen_cabecera);
      }
      if (!pieBase64 && empresa?.imagen_pie_pagina) {
        pieBase64 = await this.urlABase64(empresa.imagen_pie_pagina);
      }
    } catch (e) {
      // Si falla la carga de imágenes NO perdemos los datos de la empresa
      console.error('[RegistrarAsignacion] No se pudo cargar la empresa para el acta:', e);
    }
  }

  const htmlContent = (htmlToPdfmake as any)(this.contenidoCuerpo || '', { window });
  const tipoDocumento = String(options?.tipo_documento || this.nombre_tipo_documento || 'DOCUMENTO');
  const numeroDocumento = String(
    options?.numero_tramite ||
    (this.numero_documento_input && this.numero_documento_input.trim()) ||
    this.numeroMemorandumCompleto ||
    this.valorDelTramite('num_documento_interno') || 'S/N'
  );
  const fecha = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
  const para = options?.para ?? this.usuarios_para;
  const de = options?.de ?? this.usuarios_de;
  const copia = options?.copia ?? this.usuarios_copia;
  const asunto = options?.asunto ?? this.asunto ?? this.tramiteDatos?.asignacion?.asunto_asignar ?? 'Sin Asunto';

  const nombreEmpresa = String(empresa?.nombre_empresa || '').trim();
  const ciudadEmpresa = String(empresa?.ciudad || '').trim();
  const ciudadFecha = ciudadEmpresa ? `${ciudadEmpresa}, ${fecha}` : fecha;

  // Cabecera y pie: sólo se usan como imagen si la empresa así lo configuró
  const cabeceraImg = (cabeceraBase64 && empresa?.si_cabecera === 1) ? cabeceraBase64 : null;
  const pieImg = (pieBase64 && empresa?.si_pie_pagina === 1) ? pieBase64 : null;

  // Anexos agrupados por el documento al que pertenecen
  const bloquesAnexos: any[] = [];
  this.construirGruposAnexos(numeroDocumento).forEach(grupo => {
    if (grupo.nombres.length === 0) return;
    bloquesAnexos.push({ text: `\n${grupo.titulo}`, style: 'label', margin: [0, 12, 0, 6] });
    bloquesAnexos.push({ ul: grupo.nombres, fontSize: 9 });
  });

  // pdfMake nos informa la posición de cada nodo mientras maqueta: aprovechamos
  // el nodo ancla para saber dónde cae el espacio reservado a la firma.
  let posicionFirma: any = null;
  // Evita reprocesar en bucle si el bloque de firma no cabe ni en una hoja vacía
  let firmaYaMovida = false;

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [20, 100, 20, 100],
    // La marca de agua sólo aplica al borrador, nunca al acta oficial firmada
    ...(options?.borrador ? { watermark: { text: 'BORRADOR', color: '#e3342f', opacity: 0.08, bold: true, fontSize: 55 } } : {}),
    pageBreakBefore: (currentNode: any, followingNodesOnPage: any[]) => {
      if (currentNode?.id === 'anclaFirma' && currentNode?.startPosition) {
        posicionFirma = currentNode.startPosition;
      }

      // "Atentamente," debe ir siempre junto al nombre del firmante: si el
      // nombre no cabe en esta página, todo el bloque pasa a la siguiente.
      if (currentNode?.id === 'bloqueFirma' && !firmaYaMovida) {
        const firmanteEnLaMismaPagina = (followingNodesOnPage || []).some((n: any) => n?.id === 'firmante');
        if (!firmanteEnLaMismaPagina) {
          firmaYaMovida = true;
          return true;
        }
      }

      return false;
    },
    content: [
      // Texto de cabecera (cuando la empresa usa texto en lugar de imagen)
      {
        columns: [
          { width: '*', text: '' },
          { width: 'auto', text: (empresa?.texto_cabecera && empresa?.si_cabecera === 0) ? String(empresa.texto_cabecera || '') : '', alignment: 'center', style: 'empresa', margin: [0, 0, 0, 10] },
          { width: '*', text: '' }
        ]
      },
      // Logo centrado
      {
        columns: [
          { width: '*', text: '' },
          logoBase64
            ? { width: 'auto', stack: [{ image: logoBase64, width: 100, alignment: 'center' }] }
            : { width: 'auto', text: '' },
          { width: '*', text: '' }
        ]
      },
      // Empresa / número de documento / ciudad y fecha, alineados a la derecha
      {
        stack: [
          { text: nombreEmpresa || '', style: 'empresa', alignment: 'right', margin: [0, 0, 0, 2] },
          { text: `${tipoDocumento} Nro. ${numeroDocumento}`, style: 'docNumber', alignment: 'right', margin: [0, 0, 0, 2] },
          { text: ciudadFecha, style: 'docDate', alignment: 'right' }
        ]
      },
      { text: ' ', margin: [0, 10, 0, 0] },
      { text: ' ', margin: [0, 20, 0, 0] },
      { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 10] },

      {
        stack: [
          {
            columns: [
              { width: 55, text: 'Para:', style: 'label' },
              { width: '*', text: this.formatListaRich(para), style: 'value' }
            ],
            columnGap: 8
          },
          {
            columns: [
              { width: 55, text: 'De:', style: 'label' },
              { width: '*', text: this.formatListaRich(de), style: 'value' }
            ],
            columnGap: 8,
            margin: [0, 4, 0, 0]
          },
          ...(Array.isArray(copia) && copia.length > 0 ? [
            {
              columns: [
                { width: 55, text: 'Copia:', style: 'label' },
                { width: '*', text: this.formatListaRich(copia), style: 'value' }
              ],
              columnGap: 8,
              margin: [0, 4, 0, 0]
            }
          ] : []),
          { text: '\n' },
          {
            columns: [
              { width: 55, text: 'Asunto:', style: 'label' },
              { width: '*', text: String(asunto || 'Sin Asunto'), style: 'value' }
            ],
            columnGap: 8,
            margin: [0, 4, 0, 0]
          }
        ]
      },

      { text: '\n' },

      htmlContent,

      // Cierre: "Atentamente," + espacio reservado para la firma electrónica.
      // Los tres nodos van marcados con id para mantenerlos en la misma página.
      { text: '\n\nAtentamente,', id: 'bloqueFirma', margin: [0, 100, 0, 0] },
      // Nodo ancla: reserva el alto de la firma visual (55pt ≈ 19mm)
      { text: ' ', id: 'anclaFirma', margin: [0, 0, 0, 55] },
      { text: this.formatLista(de), id: 'firmante', bold: true },
      { text: nombreEmpresa, fontSize: 9, color: '#666', margin: [0, 4, 0, 0] },

      ...bloquesAnexos,
    ],
    footer: () => {
      if (pieImg) {
        return {
          columns: [
            { width: '*', text: '' },
            { image: pieImg, width: 515, height: 60, alignment: 'center' },
            { width: '*', text: '' }
          ],
          margin: [0, 0, 0, 0]
        };
      }

      const direccion = String(empresa?.direccion_empresa || empresa?.direccion || '').trim();
      const telefono = String(empresa?.telefono_empresa || empresa?.telefono || '').trim();
      const textoPie = String(empresa?.texto_pie_pagina || empresa?.texto_pie || '').trim();

      const parts = [direccion, telefono, textoPie].filter(p => !!p);
      if (parts.length === 0) return null;

      return {
        columns: [
          { width: '*', text: '' },
          { width: 'auto', stack: parts.map(p => ({ text: p, fontSize: 9, color: '#444', alignment: 'center' })) },
          { width: '*', text: '' }
        ],
        margin: [0, 40, 0, 0]
      };
    },
    header: cabeceraImg
      ? () => ({
          columns: [
            { width: '*', text: '' },
            { image: cabeceraImg, width: 555, height: 80, alignment: 'center' },
            { width: '*', text: '' }
          ],
          margin: [0, 0, 0, 0]
        })
      : undefined,
    styles: {
      empresa: { fontSize: 13, bold: true, color: '#111827' },
      docNumber: { fontSize: 10.5, bold: true, color: '#111827' },
      docDate: { fontSize: 9.5, color: '#374151' },
      label: { fontSize: 10, bold: true, color: '#111827' },
      value: { fontSize: 10, color: '#111827' }
    }
  };

  const buffer: ArrayBuffer = await new Promise((resolve, reject) => {
    try {
      const pMake: any = pdfMake;
      pMake.createPdf(docDefinition).getBuffer((b: any) => resolve(b));
    } catch (e) {
      reject(e);
    }
  });

  // Guardar la posición de la firma en milímetros (pdfMake trabaja en puntos)
  this.posicionFirmaActa = null;
  if (posicionFirma) {
    const aMm = (pt: number) => Number(pt) * 25.4 / 72;
    this.posicionFirmaActa = {
      pagina: Number(posicionFirma.pageNumber) || 1,
      x: Math.round(aMm(posicionFirma.left) * 100) / 100,
      y: Math.round(aMm(posicionFirma.top) * 100) / 100
    };
  }

  const blob = new Blob([buffer], { type: 'application/pdf' });
  const nombre = `ACTA_${numeroDocumento}.pdf`;
  return new File([blob], nombre, { type: 'application/pdf' });
}

// 'N/A' y 'Sin Proyecto' son rellenos del backend: para el PDF son vacío
private limpiarTexto(valor: any): string {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  const comparable = texto.toUpperCase();
  return (comparable === 'N/A' || comparable === 'SIN PROYECTO') ? '' : texto;
}

// Descompone un usuario en su nombre y la línea de título / puesto / sección
private partesUsuario(u: any): { main: string; extras: string } {
  const sigla = String(u?.sigla || u?.sigla_usuario || '').trim();
  const nombre = String(u?.nombre_completo || `${u?.nombre || ''} ${u?.apellido || ''}`.trim() || u?.name || '').trim();
  const titulo = this.limpiarTexto(u?.titulo) || this.limpiarTexto(u?.titulo_usuario);
  const puesto = this.limpiarTexto(u?.puesto) || this.limpiarTexto(u?.area) || this.limpiarTexto(u?.proyecto) || this.limpiarTexto(u?.seccion) || this.limpiarTexto(u?.subseccion);
  const seccionCruda = this.limpiarTexto(u?.seccion) || this.limpiarTexto(u?.subseccion);
  const seccion = seccionCruda === puesto ? '' : seccionCruda;

  if (!nombre) return { main: '', extras: '' };

  const main = [sigla, nombre].filter(x => !!x).join(' ').trim();

  const partes: string[] = [];
  if (titulo) partes.push(titulo);
  const puestoSeccion = [puesto, seccion].filter(x => !!x).join(' / ');
  if (puestoSeccion) partes.push(puestoSeccion);

  return { main, extras: partes.join(' — ') };
}

// Versión para pdfMake: el título y la sección/subsección van en negrilla
private formatListaRich(usuarios: any[]): any {
  if (!usuarios || usuarios.length === 0) return 'No asignado';

  const runs: any[] = [];
  (usuarios || []).forEach(u => {
    const { main, extras } = this.partesUsuario(u);
    if (!main) return;
    if (runs.length > 0) runs.push({ text: '\n\n' });
    runs.push({ text: main });
    if (extras) runs.push({ text: `\n${extras}`, bold: true });
  });

  return runs.length > 0 ? runs : 'No asignado';
}

private formatLista(usuarios: any[]): string {
  if (!usuarios || usuarios.length === 0) return 'No asignado';
  return (usuarios || [])
    .map(u => {
      const { main, extras } = this.partesUsuario(u);
      if (!main) return '';
      return extras ? `${main}\n${extras}` : main;
    })
    .filter(v => !!v)
    .join('\n\n') || 'No asignado';
}

getPrioridadLabel(): string {
  const p = this.tramiteDatos?.asignacion?.id_tipo_documento;
  return p === null || p === undefined || p === '' ? '-' : String(p);
}

getPrioridadClass(): string {
  const p = this.getPrioridadLabel().toLowerCase();
  if (p.includes('urgente')) return 'badge-light-danger';
  if (p.includes('especial')) return 'badge-light-primary';
  if (p.includes('normal')) return 'badge-light-success';
  return 'badge-light';
}

  getTiempoTramiteLabel(): string {
  const dias = this.tramiteDatos?.asignacion?.id_tipo_tramite;
  if (dias === null || dias === undefined || dias === '') return '-';
  return `${dias} días`;
  }




  cerrar() {
    this.activeModal.dismiss();
  }


onAreaChange(id_area: number | null) {
  if (!id_area) return;

  this.asignarTramite(id_area);
}

asignarTramite(id_area: number) {
    const modalRef = this.modalService.open(UsuarioAreaComponent, {
        centered: true,
        size: 'lg',
        backdrop: 'static'
    });

    modalRef.componentInstance.id_area = id_area;

    modalRef.result.then((usuariosSeleccionados: { id: number, nombre: string }[]) => {
      if (usuariosSeleccionados && usuariosSeleccionados.length > 0) {
        console.log('Usuarios recibidos del modal:', usuariosSeleccionados);
        this.usuariosSeleccionadosEnPadre = usuariosSeleccionados;
      }
    }).catch((reason) => {
      console.log('Modal cerrado sin seleccionar usuarios', reason);
    });

}


 guardarAsignacion() {
  const formData = new FormData();

  formData.append('id_tramite', this.id_tramite.toString());
  formData.append('accion', this.accion);
  
  if (this.areaDestino) {
    formData.append('id_area_destino', this.areaDestino.toString());
  }

  formData.append('descripcion', this.descripcion || '');

  if (this.usuariosSeleccionadosEnPadre && this.usuariosSeleccionadosEnPadre.length > 0) {
    const idsUsuarios = this.usuariosSeleccionadosEnPadre.map(u => u.id);
    formData.append('usuarios_ids', JSON.stringify(idsUsuarios));
  }

  if (this.archivos.length > 0) {
    this.archivos.forEach(file => {
      formData.append('archivos[]', file); 
    });
  }

  this.AsignartramiteService.asignarTramite(formData).subscribe({
    next: (resp: any) => {
      this.toast.success('Trámite procesado correctamente');
      this.tramiteC.emit();
      this.activeModal.close();
    },
    error: (err) => {
      this.toast.error('Error al procesar el trámite');
      console.error(err);
    }
  });
}





agregarFuncionario(event: any, tipo: string) {
  const idSeleccionado = event.target.value;
  if (!idSeleccionado) return;

  const funcionario = this.listaFuncionarios.find(f => f.id == idSeleccionado);

  if (funcionario) {
    if (tipo === 'PARA') {
      if (!this.funcionariosPara.find(f => f.id === funcionario.id)) {
        this.funcionariosPara.push(funcionario);
      }
    } else if (tipo === 'CC') {
      if (!this.funcionariosCC.find(f => f.id === funcionario.id)) {
        this.funcionariosCC.push(funcionario);
      }
    } else if (tipo === 'DE') {
      if (!this.funcionariosDe.find(f => f.id === funcionario.id)) {
        this.funcionariosDe.push(funcionario);
      }
    }
  }
  
  event.target.value = "";
}


guardarContenido() {
  console.log('Contenido del memorando:', this.contenidoCuerpo);
}

guardarTodo() {
  console.log("Cuerpo del doc:", this.contenidoCuerpo);
  console.log("Comentario:", this.comentarioAdicional);
}


changeTab(tab: number) {
  this.tab_active = tab;
  this.cdr.detectChanges();
}

  BuscarUsuario() {
  console.log("Intentando abrir el buscador...");
  
  const modalRef = this.modalService.open(BuscarUsuarioComponent, {
    centered: true,
    size: 'lg',
    backdrop: 'static'
  });

  modalRef.componentInstance.id_usuario = this.id_usuario;
  modalRef.componentInstance.id_empresa = this.id_empresa;

  // Pasar la lista actual del modal para edición/reemplazo
  const listaInicial = [
    ...this.usuarios_de.map(u => ({ ...u, rol_envio: 'DE' })),
    ...this.usuarios_para.map(u => ({ ...u, rol_envio: 'PARA' })),
    ...this.usuarios_copia.map(u => ({ ...u, rol_envio: 'COPIA' })),
  ];
  modalRef.componentInstance.personasIniciales = listaInicial;

  modalRef.componentInstance.usuariosAsignados.subscribe((usuarios: any[]) => {
    try {
      const cntPara = Array.isArray(usuarios) ? usuarios.filter(u => u.rol_envio === 'PARA').length : 0;
      const cntDe = Array.isArray(usuarios) ? usuarios.filter(u => u.rol_envio === 'DE').length : 0;
      const cntCopia = Array.isArray(usuarios) ? usuarios.filter(u => u.rol_envio === 'COPIA').length : 0;
      console.log('[Recepcion/AsignarTramite] usuariosAsignados recibido -> PARA:', cntPara, 'DE:', cntDe, 'COPIA:', cntCopia);
    } catch {}
    if (usuarios && usuarios.length > 0) {
      this.procesarUsuariosSeleccionados(usuarios);
      // Si hay al menos un PARA seleccionado, permitimos asignar aunque la regla de conteo lo bloquee
      if (this.usuarios_para.length > 0) {
        this.puedeAsignar = true;
      }
      console.log('[Recepcion/AsignarTramite] usuarios_para.length después de procesar:', this.usuarios_para.length);
      modalRef.close();
    }
  });
}

  procesarUsuariosSeleccionados(usuarios: any[]) {
    this.usuarios_para = usuarios.filter(u => u.rol_envio === 'PARA');
    this.usuarios_de = usuarios.filter(u => u.rol_envio === 'DE');
    this.usuarios_copia = usuarios.filter(u => u.rol_envio === 'COPIA');

    this.setUsuarioDeFijo();
    this.cdr.detectChanges();
    try {
      const names = (arr: any[]) => (arr || []).map(x => x?.nombre_completo || x?.id).join(', ');
      console.log('[Recepcion/AsignarTramite] En tabla ASIGNAR -> PARA:', this.usuarios_para.length, `[${names(this.usuarios_para)}]`,
        '| DE:', this.usuarios_de.length, `[${names(this.usuarios_de)}]`,
        '| COPIA:', this.usuarios_copia.length, `[${names(this.usuarios_copia)}]`);
    } catch {}
  }

private setUsuarioDeFijo() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const id = this.usuario_id ?? user?.id ?? null;
  if (!id) return;

  // Si ya existen destinatarios "DE" (por ejemplo venidos del borrador o
  // enriquecidos por DatosLogeado), no sobrescribimos la lista: sólo marcamos al
  // usuario logueado con su rol fijo. Reconstruirla aquí borraba título, área e
  // institución, que no están en localStorage.
  if (Array.isArray(this.usuarios_de) && this.usuarios_de.length > 0) {
    const idx = this.usuarios_de.findIndex(u => Number(u.id) === Number(id));
    if (idx >= 0) {
      this.usuarios_de[idx].rol_envio = 'DE';
      this.usuarios_de[idx].lockedRole = true;
      this.usuarios_de[idx].tiene_firma = !!user?.archivo_firma;
    }
    this.cdr.detectChanges();
    return;
  }

  const nombre = String(
    user?.nombre_completo ||
      user?.full_name ||
      `${user?.name ?? ''} ${user?.surname ?? ''}`.trim() ||
      `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim() ||
      `${user?.nombres ?? ''} ${user?.apellidos ?? ''}`.trim()
  ).trim() || 'Usuario';

  const titulo = String(user?.titulo || user?.title || user?.cargo || user?.puesto || '').trim();
  const subseccion = String(
    user?.subseccion ||
      user?.subseccion_nombre ||
      user?.area_nombre ||
      user?.nombre_area ||
      user?.departamento ||
      user?.seccion ||
      ''
  ).trim();

  const entry: any = {
    id,
    nombre_completo: nombre,
    email: user?.email ?? '',
    titulo: titulo || null,
    empresa: String(user?.empresa || user?.empresa_nombre || '').trim(),
    proyecto: 'N/A',
    subseccion: subseccion || 'N/A',
    id_proyecto: user?.id_proyecto ?? null,
    rol_envio: 'DE',
    lockedRole: true,
    tiene_firma: !!user?.archivo_firma,
  };

  this.usuarios_de = [entry];

  const idEmpresa = this.id_empresa ?? user?.id_empresa ?? null;
  if (!entry.empresa && idEmpresa) {
    this.AsignartramiteService.cargarempresaid(Number(idEmpresa)).subscribe({
      next: (empresaResp: any) => {
        entry.empresa = empresaResp?.nombre_empresa || entry.empresa || 'Sin Empresa';
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }
}

  verActas() {
    const modalRef = this.modalService.open(SeguimientoComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static'
    });

    modalRef.componentInstance.id_tramite = this.id_tramite;
    modalRef.componentInstance.tramiteDatos = this.tramiteDatos;
    modalRef.componentInstance.areas = this.areas;
    modalRef.componentInstance.soloActas = true;
  }

// Guardar borrador del trámite (Grabar)
  async guardar() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user || !user.id) {
    this.toast.error('Usuario no autenticado');
    return;
  }

  // NOTE: no declarar métodos dentro de otros métodos. Esta firma se movió fuera de guardar().
 

  if (this.guardando) return;
  this.guardando = true;

  try {
    await Swal.fire({
      title: 'Trámite en proceso',
      html: 'Por favor espere mientras se guarda...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    // Es un borrador: lleva la marca de agua "BORRADOR"
    const actaFile = await this.generarActaPdfFile({ borrador: true });

    const formData = new FormData();
    formData.append('id_tramite', String(this.id_tramite));
    // Tipo de documento / trámite: priorizar selección actual, fallback a dato del trámite
     const idTipoDoc = this.id_tipo_documento_sel ?? this.tramiteDatos?.asignacion?.id_tipo_documento;
     const idTipoTram = this.id_tipo_tramite_sel ?? this.tramiteDatos?.asignacion?.id_tipo_tramite;
     if (idTipoDoc) formData.append('id_tipo_documento', String(idTipoDoc));
     if (idTipoTram) formData.append('id_tipo_tramite', String(idTipoTram));
     // Categoría si está seleccionada
     if (this.categoria_sel) formData.append('categoria', this.categoria_sel);
     // Número documento: priorizar input editable, fallback al existente
     const numeroDoc = (this.numero_documento_input && this.numero_documento_input.trim().length > 0)
       ? this.numero_documento_input.trim()
       : String(this.tramiteDatos?.asignacion?.num_documento_interno || '');
     if (numeroDoc) formData.append('num_documento_interno', numeroDoc);
     // Asunto y cuerpo
     if (this.asunto) formData.append('asunto', this.asunto);
     if (this.contenidoCuerpo) formData.append('cuerpo_documento', this.contenidoCuerpo);
    formData.append('usuario_update', String(user.id));

      if (actaFile) formData.append('anexos[]', actaFile);
      this.archivos.forEach((f, idx) => {
        formData.append('anexos[]', f);
        const desc = this.anexosDescripcion[idx] ?? '';
        formData.append('anexos_descripcion[]', desc);
      });
      // Descripciones de anexos ya guardados (editar)
      if (Array.isArray(this.anexosGuardados) && this.anexosGuardados.length > 0) {
        this.anexosGuardados.forEach(ax => {
          if (ax && ax.id) {
            formData.append('anexos_guardados_id[]', String(ax.id));
            formData.append('anexos_guardados_descripcion[]', String(ax.descripcion ?? ''));
          }
        });
      }

    // Pasar destinatarios en el mismo request para que el backend los guarde en borrador_tramite
    this.usuarios_de.forEach(u => formData.append('de[]', String(u.id)));
    this.usuarios_para.forEach(u => formData.append('para[]', String(u.id)));
    this.usuarios_copia.forEach(u => formData.append('copia[]', String(u.id)));

    await firstValueFrom(this.AsignartramiteService.grabarTramite(formData));
    Swal.close();
    this.toast.success('Trámite y anexos guardados correctamente');
    try { this.tramiteC.emit(); } catch {}
     // Reflejar localmente el cuerpo, asunto y número documento actualizados para que la UI muestre el cambio
     this.tramiteDatos = {
       ...(this.tramiteDatos || {}),
       cuerpo_documento: this.contenidoCuerpo,
       asignacion: {
         ...(this.tramiteDatos?.asignacion || {}),
         asunto_asignar: this.asunto || this.tramiteDatos?.asignacion?.asunto_asignar,
         num_documento_interno: numeroDoc || this.tramiteDatos?.asignacion?.num_documento_interno,
       }
     };
    // Forzar actualización visual del editor con el cuerpo actual
    this.setEditorDataSafely(this.tramiteDatos.cuerpo_documento);
    const totalDest = this.usuarios_para.length + this.usuarios_copia.length + this.usuarios_de.length;
    if (totalDest < 2) {
      this.toast.info('Agrega al menos 2 destinatarios (DE/ PARA/ COPIA) antes de asignar oficialmente');
    }
    // Refrescar vistas (documentos y destinatarios) para ver cambios sin cerrar el modal
    this.documentostramite(this.id_tramite);

    // Refrescar datos del trámite desde backend para reflejar cambios sin recargar
    this.AsignartramiteService.datosTramite(this.id_tramite).subscribe({
      next: (res: any) => {
        const data = res?.tramite || res;
        if (data) {
          this.tramiteDatos = { ...(this.tramiteDatos || {}), ...data };
          if (typeof data.cuerpo_documento === 'string') {
            this.setEditorDataSafely(data.cuerpo_documento);
          }
         if (typeof data.asignacion?.asunto_asignar === 'string' && data.asignacion.asunto_asignar.trim() !== '') {
             this.asunto = data.asignacion.asunto_asignar;
           } else if (typeof data.asunto === 'string') {
             this.asunto = data.asunto;
           }
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  } catch (err: any) {
    const msg = err?.error?.message || 'No se pudo guardar el borrador';
    Swal.close();
    this.toast.error(msg);
    console.error(err);
  } finally {
    this.guardando = false;
  }
}

// Versión mínima: sin flags ni mensajes; solo envía al servicio
grabar() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const formData = new FormData();
  formData.append('id_tramite', String(this.id_tramite));

  const idTipoDoc = this.id_tipo_documento_sel ?? this.tramiteDatos?.asignacion?.id_tipo_documento;
  const idTipoTram = this.id_tipo_tramite_sel ?? this.tramiteDatos?.asignacion?.id_tipo_tramite;
  if (idTipoDoc) formData.append('id_tipo_documento', String(idTipoDoc));
  if (idTipoTram) formData.append('id_tipo_tramite', String(idTipoTram));
  if (this.categoria_sel) formData.append('categoria', this.categoria_sel);

  const numeroDoc = (this.numero_documento_input && this.numero_documento_input.trim().length > 0)
    ? this.numero_documento_input.trim()
    : String(this.tramiteDatos?.asignacion?.num_documento_interno || '');
  if (numeroDoc) formData.append('num_documento_interno', numeroDoc);

  if (this.asunto) formData.append('asunto', this.asunto);
  if (this.contenidoCuerpo) formData.append('cuerpo_documento', this.contenidoCuerpo);
  if (user?.id) formData.append('usuario_update', String(user.id));

  // Adjuntar anexos actuales tal cual (sin generar acta aquí para hacerlo ágil)
  this.archivos.forEach((f, idx) => {
    formData.append('anexos[]', f);
    const desc = this.anexosDescripcion[idx] ?? '';
    formData.append('anexos_descripcion[]', desc);
  });
  // Descripciones de anexos ya guardados (editar)
  if (Array.isArray(this.anexosGuardados) && this.anexosGuardados.length > 0) {
    this.anexosGuardados.forEach(ax => {
      if (ax && ax.id) {
        formData.append('anexos_guardados_id[]', String(ax.id));
        formData.append('anexos_guardados_descripcion[]', String(ax.descripcion ?? ''));
      }
    });
  }

  // Destinatarios del borrador
  this.usuarios_de.forEach(u => formData.append('de[]', String(u.id)));
  this.usuarios_para.forEach(u => formData.append('para[]', String(u.id)));
  this.usuarios_copia.forEach(u => formData.append('copia[]', String(u.id)));

  this.AsignartramiteService.grabarTramite(formData).subscribe({
    next: () => {
      this.toast.success('Guardado correctamente');
      // Notificar al padre para refrescar el listado
      try { this.tramiteC.emit(); } catch {}
    },
    error: (err) => {
      const msg = err?.error?.errors?.email?.[0] || 'No se pudo guardar';
      this.toast.error('Validación', msg);
    }
  });
}

  // Confirmación antes de asignar desde el botón del footer
  async confirmarAsignacion() {
  // Validación 1: Tipo de Documento
  if (!this.id_tipo_documento_sel) {
    try {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta Tipo de Documento',
        text: 'Debe seleccionar un Tipo de Documento antes de asignar el trámite.',
        confirmButtonText: 'Entendido'
      });
    } catch {}
    return;
  }
  
  // Validación 2: Tipo de Trámite
  if (!this.id_tipo_tramite_sel) {
    try {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta Tipo de Trámite',
        text: 'Debe seleccionar un Tipo de Trámite antes de asignar el trámite.',
        confirmButtonText: 'Entendido'
      });
    } catch {}
    return;
  }
  
  // Validación 3: Categoría
  if (!this.categoria_sel) {
    try {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta Categoría',
        text: 'Debe seleccionar una Categoría antes de asignar el trámite.',
        confirmButtonText: 'Entendido'
      });
    } catch {}
    return;
  }
  
  // Validación 4: Asunto
  if (!this.asunto || String(this.asunto).trim() === '') {
    try {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta Asunto',
        text: 'Debe colocar un Asunto antes de asignar el trámite.',
        confirmButtonText: 'Entendido'
      });
    } catch {}
    return;
  }
  
  // Validación 5: Usuario Para
  // Al finalizar el trámite el destinatario es opcional: puede responderse al
  // ciudadano o simplemente cerrar el trámite sin reenviarlo a nadie.
  if (!this.finalizarTramite && (!this.usuarios_para || this.usuarios_para.length === 0)) {
    try {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta Usuario Para',
        text: 'Debe seleccionar un Usuario Para (destinatario) antes de asignar el trámite.',
        confirmButtonText: 'Entendido'
      });
    } catch {}
    return;
  }
  // Mostrar en consola los datos del usuario logueado para verificación
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('Usuario logueado (confirmarAsignacion):', user);
  // Enviar el id del usuario logueado a validarFirma
  // Validar firma antes de confirmar, para informar si se firmará o no el acta
  let mensajeFirma = '';
  this.firmarActaEnAsignacion = false;
  try {
    if (user && user.id) {
      const resp: any = await firstValueFrom(this.AsignartramiteService.validarFirma(user.id));
      console.log('validarFirma - respuesta servicio (confirmarAsignacion):', resp);
      this.firmarActaEnAsignacion = !!resp?.vigente;
      mensajeFirma = this.firmarActaEnAsignacion
        ? 'Este acta será firmada electrónicamente y guardada en el servidor.'
        : 'Este acta se generará SIN FIRMA y se guardará en el servidor.';
    }
  } catch (e) {
    console.warn('No fue posible validar la firma. Se generará el acta sin firmar.', e);
    this.firmarActaEnAsignacion = false;
    mensajeFirma = 'No fue posible validar la firma. Este acta se generará SIN FIRMA y se guardará en el servidor.';
  }

  const destinatarios = this.usuarios_para?.map(u => u.nombre_completo).join(', ') || 'Sin destinatarios';
  const result1 = await Swal.fire({
    title: 'Confirmar asignación',
    html: `Se asignará el trámite a: <b>${destinatarios}</b>.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, continuar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#50cd89',
  });

  if (!result1.isConfirmed) return;

  // Segunda confirmación según disponibilidad de firma
  if (this.firmarActaEnAsignacion) {
    const result2 = await Swal.fire({
      title: 'Firmar acta',
      html: 'Usted tiene firma electrónica vigente. ¿Desea firmar esta acta?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, firmar',
      cancelButtonText: 'No, sin firmar',
      confirmButtonColor: '#1e88e5',
    });
    // Si elige no firmar, desactivamos la firma
    this.firmarActaEnAsignacion = !!result2.isConfirmed;
  } else {
    const result2 = await Swal.fire({
      title: 'Acta sin firma',
      html: 'Usted no tiene firma electrónica vigente. El acta se generará sin firmar. ¿Desea continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f6c000',
    });
    if (!result2.isConfirmed) return;
  }

  // Mostrar loader mientras se realiza la asignación (generación de acta, subida de archivos y registro)
  try {
    Swal.fire({
      title: 'Procesando trámite',
      html: 'Estamos procesando el trámite, por favor espere...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  } catch {}

  try {
    await this.registrar();
  } finally {
    try { Swal.close(); } catch {}
  }
  }

  // Depuración: refleja el estado del botón Asignar en consola
  isAsignarDisabled(): boolean {
    const disabled = !!this.guardando;
    return disabled;
  }

// Recibe el id del usuario logueado para validaciones de firma (placeholder)
validarFirma(id_usuario: number): void {
  console.log('validarFirma - id_usuario (enviando al servicio):', id_usuario);
  this.AsignartramiteService.validarFirma(id_usuario).subscribe({
    next: (resp: any) => {
      console.log('validarFirma - respuesta servicio:', resp);
      // Si el backend devuelve estructura conocida, podemos reflejar estado localmente
      // Por ejemplo, si resp.tiene_firma indica si el usuario tiene firma vigente
      if (Array.isArray(this.usuarios_de) && this.usuarios_de.length > 0 && resp && typeof resp.tiene_firma !== 'undefined') {
        this.usuarios_de[0].tiene_firma = !!resp.tiene_firma;
        this.cdr.detectChanges();
      }
    },
    error: (err) => {
      console.error('validarFirma - error servicio:', err);
    }
  });
}
  private async obtenerUsuarioPara(idUsuario: number): Promise<any[]> {
    try {
      const resp: any = await firstValueFrom(this.AsignartramiteService.usuarioDestino(idUsuario));
      const nombre = resp?.usuario ? `${resp.usuario.nombre ?? ''} ${resp.usuario.apellido ?? ''}`.trim() : '';
      return [
        {
          id: idUsuario,
          nombre_completo: nombre || `Usuario ${idUsuario}`,
        }
      ];
    } catch {
      return [
        {
          id: idUsuario,
          nombre_completo: `Usuario ${idUsuario}`,
        }
      ];
    }
  }

  abrirVistaPrevia() {
  console.log('abrirVistaPrevia() llamado desde plantilla');
  this.setUsuarioDeFijo();
  const modalRef = this.modalService.open(VistaPreviaComponent, {
    centered: true,
    size: 'xl',
    backdrop: 'static'
  });

  // Normalizar usuarios para enviar solo los campos necesarios a la vista previa
  const normalizeUsuarios = (arr: any[] | undefined) => (Array.isArray(arr) ? arr : []).map(u => ({
    id: u?.id ?? null,
    sigla: String(u?.sigla || u?.sigla_usuario || '').trim(),
    nombre_completo: String(u?.nombre_completo || `${u?.nombre || ''} ${u?.apellido || ''}`.trim()).trim(),
    titulo: String(u?.titulo || u?.titulo_usuario || u?.cargo || '').trim(),
    puesto: String(u?.puesto || u?.area || u?.proyecto || u?.seccion || u?.subseccion || '').trim(),
    seccion: String(u?.subseccion || u?.seccion || '').trim()
  }));

  const numeroMemorandum = (this.numero_documento_input && this.numero_documento_input.trim())
    || this.numeroMemorandumCompleto
    || '';

  modalRef.componentInstance.data = {
    asunto: this.asunto,
    cuerpo: this.contenidoCuerpo,
    para: normalizeUsuarios(this.usuarios_para),
    de: normalizeUsuarios(this.usuarios_de),
    copia: normalizeUsuarios(this.usuarios_copia),
    // Número de memorandum completo: GADM-DIF-TES-2026-0009-M
    num_documento_interno: numeroMemorandum,
    tipo_documento_nombre: this.nombre_tipo_documento || 'Memorando',
    // Anexos agrupados por el documento al que pertenecen
    grupos_anexos: this.construirGruposAnexos(numeroMemorandum),
    // Compatibilidad: archivos cargados actualmente
    anexos_nombres: (this.archivos || []).map(f => f?.name).filter((v: any) => !!v)
  };
}

// Agrupa los anexos guardados por su documento (oficio / memorándum) y añade
// los archivos nuevos bajo el memorándum que se está registrando.
private construirGruposAnexos(numeroMemorandum: string): { titulo: string; nombres: string[] }[] {
  const grupos: { titulo: string; nombres: string[] }[] = [];
  const indice = new Map<string, { titulo: string; nombres: string[] }>();

  const agregar = (tipo: string, numero: string, nombre: string) => {
    if (!nombre) return;
    const clave = `${tipo}||${numero}`;
    if (!indice.has(clave)) {
      const etiqueta = tipo ? `Anexos de ${tipo}` : 'Anexos del trámite';
      const grupo = { titulo: `${etiqueta}: ${numero || 'S/N'}`, nombres: [] as string[] };
      indice.set(clave, grupo);
      grupos.push(grupo);
    }
    indice.get(clave)!.nombres.push(nombre);
  };

  (this.anexosGuardados || []).forEach((ax: any) => {
    agregar(
      String(ax?.documento_tipo || '').trim(),
      String(ax?.documento_numero || '').trim(),
      String(ax?.nombre_anexo || ax?.nombre || '').trim()
    );
  });

  const tipoMemorandum = String(this.nombre_tipo_documento || 'Memorando').trim();
  (this.archivos || []).forEach((f: any) => {
    agregar(tipoMemorandum, numeroMemorandum, String(f?.name || '').trim());
  });

  return grupos;
}

  abrirSumillar() {
  // Abrir modal personalizado para mostrar/seleccionar anexos a sumillar
  try {
    const modalRef = this.modalService.open(AnexosSumillarComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });

    // Pasar los anexos cargados/guardados al componente
    modalRef.componentInstance.anexos = Array.isArray(this.anexosGuardados) ? this.anexosGuardados : [];
    modalRef.componentInstance.id_tramite = this.id_tramite;

    // Número de trámite (soporta ambas estructuras posibles del objeto)
    modalRef.componentInstance.numero_tramite =
      this.tramiteDatos?.tramite?.numero_tramite ??
      this.tramiteDatos?.numero_tramite ??
      '';

    modalRef.result.then((result) => {
      if (result && result.sumilla) {
        this.comentarioAdicional = result.sumilla;
        try { this.toast.success('Sumilla guardada temporalmente'); } catch {}
        this.cdr.detectChanges();
      }
    }).catch(() => {});
  } catch (e) {
    console.error('Error abriendo modal AnexosSumillar', e);
  }
}




  async EnviarSumillado() {
    // Validación: debe existir un destinatario "Para"
    if (!this.usuarios_para || this.usuarios_para.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta Usuario Para',
        text: 'Debe seleccionar un Usuario Para (destinatario) antes de enviar el sumillado.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // Validación: debe existir texto a sumillar
    if (!this.textoSumillar || String(this.textoSumillar).trim() === '') {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta texto a sumillar',
        text: 'Debe ingresar el texto a sumillar antes de enviar.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Validar firma para informar si se firmará o no el acta sumillada
    this.firmarActaEnAsignacion = false;
    try {
      if (user && user.id) {
        const resp: any = await firstValueFrom(this.AsignartramiteService.validarFirma(user.id));
        console.log('validarFirma - respuesta (EnviarSumillado):', resp);
        this.firmarActaEnAsignacion = !!resp?.vigente;
      }
    } catch (e) {
      console.warn('No fue posible validar la firma. El acta sumillada se generará sin firmar.', e);
      this.firmarActaEnAsignacion = false;
    }

    // 1ra confirmación: enviar el trámite sumillado
    const destinatarios = this.usuarios_para?.map(u => u.nombre_completo).join(', ') || 'Sin destinatarios';
    const result1 = await Swal.fire({
      title: 'Confirmar envío',
      html: `Se enviará el trámite sumillado a: <b>${destinatarios}</b> para su revisión.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#50cd89',
    });
    if (!result1.isConfirmed) return;

    // 2da confirmación: según disponibilidad de firma
    if (this.firmarActaEnAsignacion) {
      const result2 = await Swal.fire({
        title: 'Firmar acta sumillada',
        html: 'Usted tiene firma electrónica vigente. ¿Desea firmar esta acta sumillada?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, firmar',
        cancelButtonText: 'No, sin firmar',
        confirmButtonColor: '#1e88e5',
      });
      this.firmarActaEnAsignacion = !!result2.isConfirmed;
    } else {
      const result2 = await Swal.fire({
        title: 'Acta sin firma',
        html: 'Usted no tiene firma electrónica vigente. El acta sumillada se generará sin firmar. ¿Desea continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#f6c000',
      });
      if (!result2.isConfirmed) return;
    }

    // Loader mientras se procesa
    try {
      Swal.fire({
        title: 'Enviando sumillado',
        html: 'Por favor, espere mientras se procesa el documento...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
    } catch {}

    try {
      const idAsignacion = this.id_asignacion ?? this.tramiteDatos?.asignacion?.id_asignacion_tramite ?? this.tramiteDatos?.asignacion?.id ?? null;
      const payload: any = {
        id_tramite: this.id_tramite,
        id_asignacion: idAsignacion,
        id_asignacion_tramite: idAsignacion,      // el controlador lo lee con este nombre
        accion: 'DERIVAR',
        id_tipo_documento: this.id_tipo_documento_sel,
        id_tipo_tramite: this.id_tipo_tramite_sel,
        categoria: this.categoria_sel,
        num_documento_interno: this.numero_documento_input || this.tramiteDatos?.asignacion?.num_documento_interno,
        numero_referido: this.referenciaDisplay,
        asunto: this.asunto,
        cuerpo_documento: this.contenidoCuerpo,
        texto_sumillar: this.textoSumillar || '',
        // Instrucción al backend: firmar el acta sumillada si corresponde
        firmar_acta: this.firmarActaEnAsignacion ? '1' : '0',
        id_usuario_firma: this.firmarActaEnAsignacion ? user.id : null,
        // Posición del sello (fracciones respecto a la imagen del acta)
        x_frac: this.sumillaCoords?.x_frac,
        y_frac: this.sumillaCoords?.y_frac,
        w_frac: this.sumillaCoords?.w_frac,
        h_frac: this.sumillaCoords?.h_frac,
        page: this.sumillaCoords?.page ?? 1,
        // Nombres para el diseño del sello (De / Para)
        sumilla_de: this.usuarios_de?.map(u => u.nombre_completo).filter(Boolean).join(', ') || '',
        sumilla_para: this.usuarios_para?.map(u => u.nombre_completo).filter(Boolean).join(', ') || '',
        // Nombres que espera el controlador (para[]/de[]/copia[])
        para: this.usuarios_para?.map(u => u.id) || [],
        de: this.usuarios_de?.map(u => u.id) || [],
        copia: this.usuarios_copia?.map(u => u.id) || [],
        // Se mantienen por compatibilidad
        usuarios_para: this.usuarios_para?.map(u => u.id) || [],
        usuarios_de: this.usuarios_de?.map(u => u.id) || [],
        usuarios_copia: this.usuarios_copia?.map(u => u.id) || []
      };

      console.log('EnviarSumillado - payload a enviar:', payload);
      console.table(payload);

      await firstValueFrom(this.AsignartramiteService.retararsumillado(payload));
      try { Swal.close(); } catch {}
      this.toast.success('Trámite sumillado enviado correctamente');
      try { this.tramiteC.emit(); } catch {}
      try { this.activeModal.close(); } catch {}
    } catch (err: any) {
      try { Swal.close(); } catch {}
      console.error('EnviarSumillado - error al enviar:', err);
      this.toast.error('Error al enviar el sumillado');
    }
  }





}
