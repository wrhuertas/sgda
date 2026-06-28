import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { RecepcionService } from '../service/recepcion.service';
import { RegistrarService } from '../../RegistrarTramite/service/registrar.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { UsuarioAreaComponent } from '../usuario-area/usuario-area.component';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { BuscarUsuarioComponent } from '../buscar-usuario/buscar-usuario.component';
import { VerTramiteComponent } from '../ver-tramite/ver-tramite.component';
import { VistaPreviaComponent } from '../vista-previa/vista-previa.component';
import { SeguimientoComponent } from '../seguimiento/seguimiento.component';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as htmlToPdfmake from 'html-to-pdfmake';
import { URL_SERVICIOS } from 'src/app/config/config';

(pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;

@Component({
  selector: 'app-asignar-tramite',
  templateUrl: './asignar-tramite.component.html',
  styleUrls: ['./asignar-tramite.component.scss']
})
export class AsignarTramiteComponent {

  @Input() id_usuario: any;
  @Input() id_tramite!: number;
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
     public recepcionService: RecepcionService,
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
  if (this.tramiteDatos?.cuerpo_documento && String(this.tramiteDatos.cuerpo_documento).trim() !== '') {
    this.contenidoCuerpo = this.tramiteDatos.cuerpo_documento;
  } else if (!this.contenidoCuerpo) {
    this.contenidoCuerpo = '<p>De mi consideración:</p><p>&nbsp;</p><p>Con sentimientos de distinguida consideración.</p>';
  }
  this.setUsuarioDeFijo();
  this.incInit();
  this.documentostramite(this.id_tramite);
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
    this.recepcionService.contarPorNumeroTramite({ id_tramite: idTram }).subscribe({
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
  setTimeout(() => this.decInit(), 0);
}

  tipo_documentos: any[] = [];
  tipo_tramites: any[] = [];
  id_tipo_documento_sel: any = null;
  id_tipo_tramite_sel: any = null;
  categoria_sel: string = '';
  numero_documento_input: string = '';
  puedeAsignar: boolean = true;

private cargarTipos(idEmpresa: number) {
  // --- Tipos de documento ---
  this.incInit();
  this.registrarService.configtipo(idEmpresa).subscribe({
    next: (resp: any) => {
      console.log('LOG [Documentos]:', resp); // <--- LOG AQUÍ
      const arr = resp?.tipo_documentos || resp?.data || resp || [];
      this.tipo_documentos = Array.isArray(arr) ? arr : [];
      
      const mem = this.tipo_documentos.find((td: any) => String(td?.nombre || '').toLowerCase().includes('memor'));
      if (mem && mem.id_tipodocumento) {
        this.id_tipo_documento_sel = mem.id_tipodocumento;
      }
      this.cdr.detectChanges();
      this.decInit();
    },
    error: (err) => { 
      console.error('LOG [Error Documentos]:', err); // <--- LOG DE ERROR
      this.tipo_documentos = []; 
      this.decInit(); 
    }
  });

  // --- Tipos de trámite ---
  this.incInit();
  this.registrarService.configtipotramite(idEmpresa).subscribe({
    next: (resp: any) => {
      console.log('LOG [Tramites]:', resp); // <--- LOG AQUÍ
      const arr = resp?.tipo_tramites || resp?.data || resp || [];
      this.tipo_tramites = Array.isArray(arr) ? arr : [];
      this.id_tipo_tramite_sel = this.tramiteDatos?.id_tipo_tramite ?? this.id_tipo_tramite_sel;
      
      this.cdr.detectChanges();
      this.decInit();
    },
    error: (err) => { 
      console.error('LOG [Error Tramites]:', err); // <--- LOG DE ERROR
      this.tipo_tramites = []; 
      this.decInit(); 
    }
  });
}

  onTipoDocumentoChange(id: any) {
    try {
      const td = this.tipo_documentos.find((t: any) => String(t?.id_tipodocumento) === String(id));
      const nombre = String(td?.nombre || '').toLowerCase();
      if (nombre.includes('oficio')) {
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
      this.recepcionService.datosLogeado(id_usuario).subscribe({
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
            if (idEmp) {
              this.recepcionService.getSecuencialMemorandumRecepcion(Number(idEmp)).subscribe({
                next: (r: any) => {
                  const sec4 = String(r?.secuencial || '0001').padStart(4, '0');
                   const partes: string[] = [];
                   if (siglaEmp) partes.push(siglaEmp);
                   if (siglaProyRaiz) partes.push(siglaProyRaiz);
                   if (siglaProyActual) partes.push(siglaProyActual);
                   partes.push(String(year));
                   partes.push(sec4);
                   partes.push('M');
                   this.numero_documento_input = partes.join('-');
                   this.cdr.detectChanges();
                 },
                 error: () => {
                   const sec4 = '0001';
                   const partes: string[] = [];
                   if (siglaEmp) partes.push(siglaEmp);
                   if (siglaProyRaiz) partes.push(siglaProyRaiz);
                   if (siglaProyActual) partes.push(siglaProyActual);
                  partes.push(String(year));
                  partes.push(sec4);
                  partes.push('M');
                  this.numero_documento_input = partes.join('-');
                  this.cdr.detectChanges();
                }
              });
            } else {
              const sec4 = '0001';
                   const partes: string[] = [];
                   if (siglaEmp) partes.push(siglaEmp);
                   if (siglaProyRaiz) partes.push(siglaProyRaiz);
                   if (siglaProyActual) partes.push(siglaProyActual);
                   partes.push(String(year));
              partes.push(sec4);
              partes.push('M');
              this.numero_documento_input = partes.join('-');
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

  // Mostrar solo el número de referencia sin sufijo (p. ej. sin "-VAC")
  get referenciaDisplay(): string {
    const base = String(this.tramiteDatos?.num_documento_interno || '').trim();
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
  this.recepcionService.docuemntosTramite(id_tramite).subscribe({
    next: (resp: any) => {
      const tramite = resp.tramite || resp; // Ajusta según la estructura exacta de tu respuesta
      this.categoria_sel = tramite.categoria || '';
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
  this.actualizarResumenDinamico();
}

  private generarResumenDinamico(): string {
    if (this.archivos.length === 0) {
      return '';
    }

    const nombres = this.archivos.map(f => f.name.toLowerCase());
    let resumen = '<p><strong>Documento(s) adjunto(s):</strong></p><ul>';

    // Detectar tipos de documentos y generar resumen
    const tiposDetectados = new Set<string>();
    
    nombres.forEach(nombre => {
      if (nombre.includes('solicitud')) tiposDetectados.add('solicitud');
      if (nombre.includes('contrato') || nombre.includes('acuerdo')) tiposDetectados.add('contrato');
      if (nombre.includes('factura') || nombre.includes('invoice')) tiposDetectados.add('factura');
      if (nombre.includes('certificado') || nombre.includes('certificate')) tiposDetectados.add('certificado');
      if (nombre.includes('autorizacion') || nombre.includes('authorization')) tiposDetectados.add('autorización');
      if (nombre.includes('informe') || nombre.includes('report')) tiposDetectados.add('informe');
      if (nombre.includes('presupuesto') || nombre.includes('budget')) tiposDetectados.add('presupuesto');
      if (nombre.includes('recibo') || nombre.includes('receipt')) tiposDetectados.add('recibo');
      if (nombre.includes('comprobante') || nombre.includes('voucher')) tiposDetectados.add('comprobante');
      if (nombre.includes('imagen') || nombre.includes('photo') || nombre.includes('.png') || nombre.includes('.jpg') || nombre.includes('.jpeg')) tiposDetectados.add('imagen');
    });

    // Agregar lista de archivos
    nombres.forEach(nombre => {
      const nombreLimpio = nombre.replace(/\.[^/.]+$/, ''); // Remover extensión
      resumen += `<li>${nombreLimpio}</li>`;
    });
    resumen += '</ul>';

    // Generar texto introductorio basado en tipos detectados
    let textoIntro = '<p>Se adjuntan ';
    const tiposArray = Array.from(tiposDetectados);
    
    if (tiposArray.length === 0) {
      textoIntro += `${this.archivos.length} archivo(s) para su revisión.`;
    } else if (tiposArray.length === 1) {
      textoIntro += `el/la ${tiposArray[0]} solicitado(a).`;
    } else {
      textoIntro += `los siguientes documentos: ${tiposArray.join(', ')}.`;
    }
    textoIntro += '</p>';

    return textoIntro + resumen;
  }

  private actualizarResumenDinamico(): void {
    // Esta función se puede llamar cuando cambien los archivos
    // Por ahora la dejamos lista para cuando el usuario quiera actualizar el cuerpo
  }

  insertarResumenDinamico(): void {
    if (this.archivos.length === 0) {
      this.toast.warning('No hay anexos seleccionados');
      return;
    }

    const resumen = this.generarResumenDinamico();
    const textoIntroductorio = '<p>De mi consideración:</p><p>&nbsp;</p>';
    
    // Insertar el resumen después de "De mi consideración:"
    this.contenidoCuerpo = textoIntroductorio + resumen + '<p>&nbsp;</p><p>Con sentimientos de distinguida consideración.</p>';
    
    // Actualizar el editor
    if (this.editorInstance) {
      try {
        this.editorInstance.setData(this.contenidoCuerpo);
      } catch {}
    }
    
    this.cdr.detectChanges();
    this.toast.success('Resumen de anexos insertado correctamente');
  }

  private generarResumenDeAnexosGuardados(): void {
    if (!this.anexosGuardados || this.anexosGuardados.length === 0) {
      return;
    }

    // Contar tipos de elementos
    let carpetas = 0;
    let cds = 0;
    let documentos = 0;
    const listaNombres: string[] = [];

    this.anexosGuardados.forEach(ax => {
      const nombre = (ax?.nombre_anexo || '').toLowerCase();
      const nombreLimpio = (ax?.nombre_anexo || '').replace(/\.[^/.]+$/, '');
      
      if (nombre.includes('carpeta')) {
        carpetas++;
      } else if (nombre.includes('cd') || nombre.includes('dvd')) {
        cds++;
      } else {
        documentos++;
      }
      
      if (nombreLimpio) {
        listaNombres.push(nombreLimpio);
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
    const numeroTramite = this.tramiteDatos?.numero_tramite || this.tramiteDatos?.num_documento_interno || 'N/A';
    const cliente = this.tramiteDatos?.cliente_nombre || 'N/A';
    const asunto = this.tramiteDatos?.asunto_tramite || this.asunto || 'el trámite';

    // Generar el resumen con formato formal
    let resumen = `<p>Me permito entregar el documento original más ${elementosTexto} referente al Trámite Nº ${numeroTramite} ${cliente} ${asunto}, para su respectiva gestión.</p>`;

    // Agregar lista de anexos
    /*if (listaNombres.length > 0) {
      resumen += '<p><strong>Resumen de Anexos del Trámite:</strong></p><ul>';
      listaNombres.forEach(nombre => {
        resumen += `<li>${nombre}</li>`;
      });
      resumen += '</ul>';
    }*/

    // Si el contenido actual no tiene "Me permito", agregarlo automáticamente
    if (!this.contenidoCuerpo.includes('Me permito')) {
      this.contenidoCuerpo = '<p>De mi consideración:</p><p>&nbsp;</p>' + resumen + '<p>&nbsp;</p><p>Con sentimientos de distinguida consideración.</p>';
      
      if (this.editorInstance) {
        try {
          this.editorInstance.setData(this.contenidoCuerpo);
        } catch {}
      }
    }
  }



  async registrar() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user || !user.id) {
      this.toast.error('Usuario no autenticado');
      return;
    }

    this.setUsuarioDeFijo();

    const destino = this.usuarios_para?.[0]?.id;
    if (!destino) {
      this.toast.error('Falta el destinatario. Use "Buscar Usuario", agregue el usuario y en "Colocar como" seleccione "Para", luego "Asignar Usuarios".');
      return;
    }

    if (!this.usuarios_de?.[0]?.tiene_firma) {
      this.toast.error('El usuario que envía (De) no tiene firma electrónica');
      return;
    }

    // Áreas ya no son requeridas según la nueva regla
    const areaOrigen = this.tramiteDatos?.id_area_origen ?? null;
    const areaDestino = this.areaDestino ?? this.tramiteDatos?.id_area_destino ?? null;

    if (this.guardando) return;
    this.guardando = true;

    try {
      const actaFile = await this.generarActaPdfFile({
        numero_tramite: this.tramiteDatos?.num_documento_interno,
        tipo_documento: this.tramiteDatos?.tipo_documento_nombre
      });

      const formData = new FormData();

      formData.append('id_tramite', this.id_tramite.toString());
      formData.append('id_asignacion_tramite', this.tramiteDatos?.id_asignacion_tramite?.toString() || '');
      formData.append('accion', this.accion);
      formData.append('descripcion', this.descripcion ?? '');

      // No enviamos áreas; backend ya no las requiere según la nueva regla

      formData.append('id_usuario_origen', user.id.toString());
      formData.append('id_usuario_destino', destino.toString());

      // Instrucción al backend: firmar el acta si el usuario tiene firma vigente
      formData.append('firmar_acta', this.firmarActaEnAsignacion ? '1' : '0');
      if (this.firmarActaEnAsignacion && user?.id) {
        formData.append('id_usuario_firma', String(user.id));
      }

      formData.append('archivos[]', actaFile);
      this.archivos.forEach(file => formData.append('archivos[]', file));

      // Enviar también los destinatarios actuales para que el backend pueda
      // persistirlos/usar sin depender de un paso previo de "Guardar".
      // Formato compatible con los endpoints existentes (para[], copia[], de[])
      this.usuarios_de.forEach(u => formData.append('de[]', String(u.id)));
      this.usuarios_para.forEach(u => formData.append('para[]', String(u.id)));
      this.usuarios_copia.forEach(u => formData.append('copia[]', String(u.id)));

      // Enviar metadata informativa del trámite para que el backend pueda tomar snapshot
      // o futura persistencia al asignar, sin requerir el paso de "Guardar".
      const tipoDocId = this.id_tipo_documento_sel ?? this.tramiteDatos?.id_tipo_documento ?? null;
      const tipoTramId = this.id_tipo_tramite_sel ?? this.tramiteDatos?.id_tipo_tramite ?? null;
      const categoria = this.categoria_sel ?? this.tramiteDatos?.categoria ?? null;
      const numeroDoc = (this.numero_documento_input && this.numero_documento_input.trim().length > 0)
        ? this.numero_documento_input.trim()
        : (this.tramiteDatos?.num_documento_interno ?? '');
      const numeroTramite = this.tramiteDatos?.numero_tramite ?? '';
      const numeroReferido = this.tramiteDatos?.numero_referido ?? '';
      const asunto = this.asunto || this.tramiteDatos?.asunto_tramite || this.tramiteDatos?.asunto || '';
      const cuerpo = this.contenidoCuerpo || this.tramiteDatos?.cuerpo_documento || '';

      if (tipoDocId) formData.append('id_tipo_documento', String(tipoDocId));
      if (tipoTramId) formData.append('id_tipo_tramite', String(tipoTramId));
      if (categoria) formData.append('categoria', String(categoria));
      if (numeroDoc) formData.append('num_documento_interno', String(numeroDoc));
      if (numeroTramite) formData.append('numero_tramite', String(numeroTramite));
      if (numeroReferido) formData.append('numero_referido', String(numeroReferido));
      if (asunto) formData.append('asunto', String(asunto));
      if (cuerpo) formData.append('cuerpo_documento', String(cuerpo));

      await firstValueFrom(this.recepcionService.asginartramite(formData));
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

private async generarActaPdfFile(options?: { para?: any[]; de?: any[]; copia?: any[]; asunto?: string; numero_tramite?: string; tipo_documento?: string }): Promise<File> {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const idEmpresa = user?.id_empresa ?? null;
  let empresa: any = null;
  let logoBase64: string | null = null;

  if (idEmpresa) {
    try {
      empresa = await firstValueFrom(this.recepcionService.cargarempresaidVistaPrevia(idEmpresa));
      const urlLogo = String(empresa?.imagen_empresa || '').trim();
      if (urlLogo) {
        const blob = await firstValueFrom(this.http.get(urlLogo, { responseType: 'blob' }));
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      empresa = null;
      logoBase64 = null;
    }
  }

  const htmlContent = (htmlToPdfmake as any)(this.contenidoCuerpo || '', { window });
  const tipoDocumento = String(options?.tipo_documento || this.tramiteDatos?.tipo_documento_nombre || 'DOCUMENTO');
  const numeroTramite = String(options?.numero_tramite || this.tramiteDatos?.num_documento_interno || 'S/N');
  const fecha = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
  const para = options?.para ?? this.usuarios_para;
  const de = options?.de ?? this.usuarios_de;
  const copia = options?.copia ?? this.usuarios_copia;
  const asunto = options?.asunto ?? this.asunto ?? this.tramiteDatos?.asunto_tramite ?? 'Sin Asunto';

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60],
    content: [
      {
        columns: [
          logoBase64
            ? { image: logoBase64, width: 100 }
            : { text: empresa?.nombre_empresa || '', bold: true, fontSize: 12 },
          {
            stack: [
              { text: `${tipoDocumento} Nro. ${numeroTramite}`, style: 'header', alignment: 'right' },
              { text: fecha, alignment: 'right', fontSize: 10 },
            ],
            margin: [0, 10, 0, 0],
          },
        ],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#eeeeee' }] },
      { text: '\n' },
      {
        table: {
          widths: [60, '*'],
          body: [
            [{ text: 'PARA:', bold: true, fillColor: '#f3f3f3' }, { text: this.formatLista(para) }],
            [{ text: 'DE:', bold: true, fillColor: '#f3f3f3' }, { text: this.formatLista(de) }],
            [{ text: 'COPIA:', bold: true, fillColor: '#f3f3f3' }, { text: this.formatLista(copia) }],
            [{ text: 'ASUNTO:', bold: true, fillColor: '#f3f3f3' }, { text: asunto }],
            [{ text: 'FECHA:', bold: true, fillColor: '#f3f3f3' }, { text: fecha }],
          ],
        },
        layout: 'lightHorizontalLines',
      },
      { text: '\n\n' },
      htmlContent,
      { text: '\n\nAtentamente,\n\n', margin: [0, 30, 0, 0] },
      {
        stack: [
          { text: 'Firmado electrónicamente', italics: true, color: '#004a99', fontSize: 9 },
          { text: this.formatLista(de), bold: true, margin: [0, 5, 0, 0] },
          { text: empresa?.nombre_empresa || '', fontSize: 9, color: '#666' },
        ],
        alignment: 'left',
      },
    ],
    styles: {
      header: { fontSize: 13, bold: true, color: '#333' },
    },
  };

  const buffer: ArrayBuffer = await new Promise((resolve, reject) => {
    try {
      const pMake: any = pdfMake;
      pMake.createPdf(docDefinition).getBuffer((b: any) => resolve(b));
    } catch (e) {
      reject(e);
    }
  });

  const blob = new Blob([buffer], { type: 'application/pdf' });
  const nombre = `ACTA_${numeroTramite}.pdf`;
  return new File([blob], nombre, { type: 'application/pdf' });
}

private formatLista(usuarios: any[]): string {
  if (!usuarios || usuarios.length === 0) return 'No asignado';
  return usuarios.map(u => `${u.nombre_completo}`).join(', ');
}

getPrioridadLabel(): string {
  const p = this.tramiteDatos?.tipo_documento_prioridad;
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
  const dias = this.tramiteDatos?.tipo_tramite_dias;
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

  this.recepcionService.asignarTramite(formData).subscribe({
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
    this.recepcionService.cargarempresaid(Number(idEmpresa)).subscribe({
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
    const actaFile = await this.generarActaPdfFile({
      numero_tramite: this.tramiteDatos?.num_documento_interno,
      tipo_documento: this.tramiteDatos?.tipo_documento_nombre
    });

    const formData = new FormData();
    formData.append('id_tramite', String(this.id_tramite));
    // Tipo de documento / trámite: priorizar selección actual, fallback a dato del trámite
    const idTipoDoc = this.id_tipo_documento_sel ?? this.tramiteDatos?.id_tipo_documento;
    const idTipoTram = this.id_tipo_tramite_sel ?? this.tramiteDatos?.id_tipo_tramite;
    if (idTipoDoc) formData.append('id_tipo_documento', String(idTipoDoc));
    if (idTipoTram) formData.append('id_tipo_tramite', String(idTipoTram));
    // Categoría si está seleccionada
    if (this.categoria_sel) formData.append('categoria', this.categoria_sel);
    // Número documento: priorizar input editable, fallback al existente
    const numeroDoc = (this.numero_documento_input && this.numero_documento_input.trim().length > 0)
      ? this.numero_documento_input.trim()
      : String(this.tramiteDatos?.num_documento_interno || '');
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

    await firstValueFrom(this.recepcionService.grabarTramite(formData));
    Swal.close();
    this.toast.success('Trámite y anexos guardados correctamente');
    try { this.tramiteC.emit(); } catch {}
    // Reflejar localmente el cuerpo, asunto y número documento actualizados para que la UI muestre el cambio
    this.tramiteDatos = {
      ...(this.tramiteDatos || {}),
      cuerpo_documento: this.contenidoCuerpo,
      asunto_tramite: this.asunto || this.tramiteDatos?.asunto_tramite,
      num_documento_interno: numeroDoc || this.tramiteDatos?.num_documento_interno,
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
    this.recepcionService.datosTramite(this.id_tramite).subscribe({
      next: (res: any) => {
        const data = res?.tramite || res;
        if (data) {
          this.tramiteDatos = { ...(this.tramiteDatos || {}), ...data };
          if (typeof data.cuerpo_documento === 'string') {
            this.setEditorDataSafely(data.cuerpo_documento);
          }
          if (typeof data.asunto_tramite === 'string' && data.asunto_tramite.trim() !== '') {
            this.asunto = data.asunto_tramite;
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

  const idTipoDoc = this.id_tipo_documento_sel ?? this.tramiteDatos?.id_tipo_documento;
  const idTipoTram = this.id_tipo_tramite_sel ?? this.tramiteDatos?.id_tipo_tramite;
  if (idTipoDoc) formData.append('id_tipo_documento', String(idTipoDoc));
  if (idTipoTram) formData.append('id_tipo_tramite', String(idTipoTram));
  if (this.categoria_sel) formData.append('categoria', this.categoria_sel);

  const numeroDoc = (this.numero_documento_input && this.numero_documento_input.trim().length > 0)
    ? this.numero_documento_input.trim()
    : String(this.tramiteDatos?.num_documento_interno || '');
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

  this.recepcionService.grabarTramite(formData).subscribe({
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
  // Validación: Asunto obligatorio antes de asignar
  if (!this.asunto || String(this.asunto).trim() === '') {
    try {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta Asunto',
        text: 'Debe colocar un asunto antes de asignar el trámite.',
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
      const resp: any = await firstValueFrom(this.recepcionService.validarFirma(user.id));
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
      title: 'Asignando trámite',
      html: 'Por favor, espere un momento mientras se completa la asignación...',
      allowOutsideClick: false,
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
    const disabled = !!this.guardando || !this.puedeAsignar;
    return disabled;
  }

// Recibe el id del usuario logueado para validaciones de firma (placeholder)
validarFirma(id_usuario: number): void {
  console.log('validarFirma - id_usuario (enviando al servicio):', id_usuario);
  this.recepcionService.validarFirma(id_usuario).subscribe({
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


  async rechazar() {
    const result = await Swal.fire({
      title: 'Rechazar trámite',
      input: 'textarea',
      inputLabel: 'Observación',
      inputPlaceholder: 'Escriba el motivo del rechazo...',
      inputAttributes: { 'aria-label': 'Observación' },
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f1416c',
      preConfirm: (value) => {
        const v = String(value || '').trim();
        if (!v) {
          Swal.showValidationMessage('La observación es obligatoria');
        }
        return v;
      }
    });

    if (!result.isConfirmed) return;

    const observacion = String(result.value || '').trim();
    await this.enviarRechazo(observacion);
  }

  private async enviarRechazo(observacion: string): Promise<void> {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user?.id) {
      this.toast.error('Usuario no autenticado');
      return;
    }

    this.setUsuarioDeFijo();

    // Solo bloquear si se eligió firmar pero el usuario no tiene firma
    if (this.firmarActaEnAsignacion && !this.usuarios_de?.[0]?.tiene_firma) {
      this.toast.error('No es posible firmar: el usuario (De) no tiene firma electrónica.');
      return;
    }

    const idAreaOrigen = user?.id_proyecto ?? null;
    const idUsuarioDestino = this.tramiteDatos?.id_usuario_origen;
    const idAreaDestino = this.tramiteDatos?.id_area_origen;

    if (!idAreaOrigen) {
      this.toast.error('No se encontró el área del usuario que rechaza');
      return;
    }
    if (!idUsuarioDestino || !idAreaDestino) {
      this.toast.error('No se encontró el destinatario del rechazo');
      return;
    }

    if (this.guardando) return;
    this.guardando = true;

    try {
      const paraRechazo = await this.obtenerUsuarioPara(idUsuarioDestino);
      const actaFile = await this.generarActaPdfFile({
        para: paraRechazo,
        de: this.usuarios_de,
        asunto: this.asunto || this.tramiteDatos?.asunto_tramite || '',
        numero_tramite: this.tramiteDatos?.num_documento_interno,
        tipo_documento: this.tramiteDatos?.tipo_documento_nombre
      });

      const formData = new FormData();
      formData.append('id_tramite', this.id_tramite.toString());
      formData.append('accion', 'RECHAZAR');
      formData.append('usuario_registro', user.id.toString());
      formData.append('descripcion', observacion);
      formData.append('id_area_origen', String(idAreaOrigen));
      formData.append('id_usuario_origen', user.id.toString());
      formData.append('id_area_destino', String(idAreaDestino));
      formData.append('id_usuario_destino', String(idUsuarioDestino));
      formData.append('archivos[]', actaFile);

      await firstValueFrom(this.recepcionService.asginartramite(formData));
      this.toast.success('Trámite rechazado correctamente');
      this.tramiteC.emit();
      this.activeModal.close();
    } catch (err) {
      this.toast.error('No se pudo rechazar el trámite');
      console.error(err);
    } finally {
      this.guardando = false;
    }
  }

  private async obtenerUsuarioPara(idUsuario: number): Promise<any[]> {
    try {
      const resp: any = await firstValueFrom(this.recepcionService.usuarioDestino(idUsuario));
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
  this.setUsuarioDeFijo();
  const modalRef = this.modalService.open(VistaPreviaComponent, {
    centered: true,
    size: 'xl',
    backdrop: 'static'
  });

  modalRef.componentInstance.data = {
    asunto: this.asunto,
    cuerpo: this.contenidoCuerpo,
    para: this.usuarios_para,
    de: this.usuarios_de,
    copia: this.usuarios_copia,
    // En vista previa queremos ver el Nº de Documento actual (no Nº Trámite)
    num_documento_interno: this.numero_documento_input || this.tramiteDatos?.num_documento_interno,
    tipo_documento_nombre: this.tramiteDatos?.tipo_documento_nombre,
    anexos_nombres: [
      // Solo archivos seleccionados actualmente (no los guardados anteriormente)
      ...((this.archivos || []).map(f => f?.name).filter((v: any) => !!v))
    ]
  };
}


}
