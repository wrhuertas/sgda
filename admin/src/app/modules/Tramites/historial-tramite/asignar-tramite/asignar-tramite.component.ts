import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';

import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { UsuarioAreaComponent } from '../usuario-area/usuario-area.component';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { BuscarUsuarioComponent } from '../buscar-usuario/buscar-usuario.component';
import { VerTramiteComponent } from '../ver-tramite/ver-tramite.component';
import { VistaPreviaComponent } from '../vista-previa/vista-previa.component';
//import { SeguimientoComponent } from '../seguimiento/seguimiento.component';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as htmlToPdfmake from 'html-to-pdfmake';
import { HistorialtramiteService } from '../service/historialtramite.service';

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
usuarioDestinoNombre: string = '';

usuariosSeleccionadosEnPadre: { id: number, nombre: string }[] = []; 
documentosTramite: any[] = [];
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


  constructor(public activeModal: NgbActiveModal,
     public recepcionService: HistorialtramiteService,
     public toast: ToastrService,
         private cdr: ChangeDetectorRef,
         public authService: AuthService,
          public modalService: NgbModal,
          private http: HttpClient,
  ) {}

  ngOnInit() {

    const user = this.authService.user;
    
    if (user) {
      this.id_empresa = user.id_empresa;
      this.usuario_id = user.id;
      console.log('ID Empresa cargado:', this.id_empresa);
    }
  this.asunto = this.tramiteDatos?.asunto_tramite || this.asunto || '';
  // Inicializar editor con el cuerpo del trámite si existe
  if (this.tramiteDatos?.cuerpo_documento && String(this.tramiteDatos.cuerpo_documento).trim() !== '') {
    this.contenidoCuerpo = this.tramiteDatos.cuerpo_documento;
  } else if (!this.contenidoCuerpo) {
    this.contenidoCuerpo = '<p>De mi consideración:</p><p>&nbsp;</p><p>Con sentimientos de distinguida consideración.</p>';
  }
  this.setUsuarioDeFijo();
  console.log('ID TRÁMITE RECIBIDO:', this.id_tramite);

  console.log('Trámite completo recibido:', this.tramiteDatos);

  console.log('Campos del objeto:', Object.keys(this.tramiteDatos));

  console.log('ID AREA ORIGEN:', this.tramiteDatos.id_area_origen);
  console.log('ID USUARIO ORIGEN:', this.tramiteDatos.id_usuario_origen);
  console.log('ID AREA DESTINO:', this.tramiteDatos.id_area_destino);
  console.log('ID USUARIO DESTINO:', this.tramiteDatos.id_usuario_destino);

  this.documentostramite(this.id_tramite);
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

  // Construye No. Referencia con sufijo de iniciales del tipo de trámite
  get referenciaDisplay(): string {
    const base = String(this.tramiteDatos?.num_documento_interno || '').trim();
    const tipo = String(this.tramiteDatos?.tipo_tramite_nombre || '').trim();
    if (!base) return '';
    const initials = this.getInitials(tipo);
    return initials ? `${base}-${initials}` : base;
  }

  private getInitials(text: string): string {
    if (!text) return '';
    // Tomar las 3 primeras letras (ignorando espacios y símbolos), en mayúsculas
    const compact = text.normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '');
    return compact.slice(0, 3).toUpperCase();
  }


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
      // Documentos
      this.documentosTramite = Array.isArray(resp?.documentos) ? resp.documentos : [];

      // Usuarios borrador (cuando estado_borrador = 1)
      const usuarios = Array.isArray(resp?.usuarios_borrador) ? resp.usuarios_borrador : [];
      if (usuarios.length > 0) {
        this.usuarios_para = usuarios.filter((u: any) => (u.rol_envio || u.tipo_rol) === 'PARA');
        this.usuarios_copia = usuarios.filter((u: any) => (u.rol_envio || u.tipo_rol) === 'COPIA');
        this.usuarios_de = usuarios.filter((u: any) => (u.rol_envio || u.tipo_rol) === 'DE');
      }

      this.cdr.detectChanges();
    },
    error: () => {
      this.documentosTramite = [];
      this.toast.error('No se pudo cargar los documentos');
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

removeFile(index: number) {
  this.archivos.splice(index, 1);
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
    if (usuarios && usuarios.length > 0) {
      this.procesarUsuariosSeleccionados(usuarios);
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
   /* const modalRef = this.modalService.open(SeguimientoComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static'
    });

    modalRef.componentInstance.id_tramite = this.id_tramite;
    modalRef.componentInstance.tramiteDatos = this.tramiteDatos;
    modalRef.componentInstance.areas = this.areas;
    modalRef.componentInstance.soloActas = true;*/
  }

// Guardar borrador del trámite (Grabar)
async guardar() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user || !user.id) {
    this.toast.error('Usuario no autenticado');
    return;
  }
 

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
    if (this.tramiteDatos?.id_tipo_documento)
      formData.append('id_tipo_documento', String(this.tramiteDatos.id_tipo_documento));
    if (this.tramiteDatos?.id_tipo_tramite)
      formData.append('id_tipo_tramite', String(this.tramiteDatos.id_tipo_tramite));
    if (this.asunto)
      formData.append('asunto', this.asunto);
    if (this.tramiteDatos?.num_documento_interno)
      formData.append('num_documento_interno', String(this.tramiteDatos.num_documento_interno));
    if (this.contenidoCuerpo)
      formData.append('cuerpo_documento', this.contenidoCuerpo);
    formData.append('usuario_update', String(user.id));

    if (actaFile) formData.append('anexos[]', actaFile);
    this.archivos.forEach(f => formData.append('anexos[]', f));

    // Pasar destinatarios en el mismo request para que el backend los guarde en borrador_tramite
    this.usuarios_de.forEach(u => formData.append('de[]', String(u.id)));
    this.usuarios_para.forEach(u => formData.append('para[]', String(u.id)));
    this.usuarios_copia.forEach(u => formData.append('copia[]', String(u.id)));

    await firstValueFrom(this.recepcionService.grabarTramite(formData));
    Swal.close();
    this.toast.success('Trámite y anexos guardados correctamente');
    // Reflejar localmente el cuerpo y asunto actualizados para que la UI muestre el cambio
    this.tramiteDatos = {
      ...(this.tramiteDatos || {}),
      cuerpo_documento: this.contenidoCuerpo,
      asunto_tramite: this.asunto || this.tramiteDatos?.asunto_tramite,
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

// Confirmación antes de asignar desde el botón del footer
async confirmarAsignacion() {
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

  await this.registrar();
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
    numero_tramite: this.tramiteDatos?.num_documento_interno,
    tipo_documento_nombre: this.tramiteDatos?.tipo_documento_nombre
  };
}


}
