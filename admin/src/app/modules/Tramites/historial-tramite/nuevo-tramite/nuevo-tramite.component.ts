import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BuscarUsuarioComponent } from '../buscar-usuario/buscar-usuario.component';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import { ToastrService } from 'ngx-toastr';
import { VistaPreviaComponent } from '../vista-previa/vista-previa.component';
import { HistorialtramiteService } from '../service/historialtramite.service';
import { firstValueFrom } from 'rxjs';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as htmlToPdfmake from 'html-to-pdfmake';
import { SeguimientoComponent } from '../../Seguimiento/seguimiento.component';

(pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;

@Component({
  selector: 'app-nuevo-tramite',
  templateUrl: './nuevo-tramite.component.html',
  styleUrls: ['./nuevo-tramite.component.scss']
})
export class NuevoTramiteComponent implements OnInit {

  @Input() id_usuario: any;
  @Input() id_empresa: any;
  @Input() id_tipo_documento: any;
  @Input() nombre_tipo_documento: any;

  @Output() tramiteC = new EventEmitter<void>();

  tab_active: number = 1;
  public Editor: any = ClassicEditor;
  public contenidoCuerpo: string = '<p>De mi consideración:</p><p>&nbsp;</p><p>Con sentimientos de distinguida consideración.</p>';
  public editorConfig = { language: 'es' };

  usuarios_para: any[] = [];
  usuarios_de: any[] = [];
  usuarios_copia: any[] = [];

  tipo_documentos: any[] = [];
  tipo_tramites: any[] = [];

  tipo_documento: any = '';
  tipo_tramite: any = '';

  n_interno: string = '';
  asunto: string = '';
  folios: number = 1;

  archivos: File[] = [];
  guardando: boolean = false;

  id_tramite_creado: number | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private HistorialtramiteService: HistorialtramiteService,
    public toast: ToastrService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!this.id_usuario) this.id_usuario = user?.id ?? null;
    if (!this.id_empresa) this.id_empresa = user?.id_empresa ?? null;

    if (!this.id_empresa) {
      this.toast.error('No se pudo identificar la empresa de la sesión');
      return;
    }

    this.setUsuarioDeFijo();
    this.cargarTipos();
  }

  private setUsuarioDeFijo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const id = this.id_usuario ?? user?.id ?? null;
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
      this.HistorialtramiteService.cargarempresaid(Number(idEmpresa)).subscribe({
        next: (empresaResp: any) => {
          entry.empresa = empresaResp?.nombre_empresa || entry.empresa || 'Sin Empresa';
          this.cdr.detectChanges();
        },
        error: () => this.cdr.detectChanges()
      });
    }
  }

  BuscarUsuario() {
    const modalRef = this.modalService.open(BuscarUsuarioComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });
  
    modalRef.componentInstance.id_usuario = this.id_usuario;
    modalRef.componentInstance.id_empresa = this.id_empresa;

    modalRef.componentInstance.usuariosAsignados.subscribe((usuarios: any[]) => {
      if (usuarios && usuarios.length > 0) {
        this.procesarUsuariosSeleccionados(usuarios);
        modalRef.close();
      }
    });
  }

  changeTab(tab: number) {
    this.tab_active = tab;
  }

  private cargarTipos() {
    this.HistorialtramiteService.configTipoDocumento(this.id_empresa).subscribe({
      next: (resp: any) => {
        this.tipo_documentos = resp?.tipo_documentos || [];
        if (this.id_tipo_documento) {
          this.tipo_documento = this.id_tipo_documento;
          this.actualizarNumeroInterno();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.tipo_documentos = [];
        this.cdr.detectChanges();
      }
    });

    this.HistorialtramiteService.configTipoTramite(this.id_empresa).subscribe({
      next: (resp: any) => {
        this.tipo_tramites = resp?.tipo_tramites || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.tipo_tramites = [];
        this.cdr.detectChanges();
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

  getTipoDocumentoSeleccionado(): any | null {
    return this.tipo_documentos.find((d: any) => String(d.id_tipodocumento) === String(this.tipo_documento)) || null;
  }

  getTipoTramiteSeleccionado(): any | null {
    return this.tipo_tramites.find((t: any) => String(t.id_tipo_tramite) === String(this.tipo_tramite)) || null;
  }

  getPrioridadLabel(): string {
    const doc = this.getTipoDocumentoSeleccionado();
    return doc?.prioridad ? String(doc.prioridad) : '-';
  }

  getPrioridadClass(): string {
    const p = this.getPrioridadLabel().toLowerCase();
    if (p.includes('urgente')) return 'badge-light-danger';
    if (p.includes('especial')) return 'badge-light-primary';
    if (p.includes('normal')) return 'badge-light-success';
    return 'badge-light';
  }

  getTiempoTramiteLabel(): string {
    const tt = this.getTipoTramiteSeleccionado();
    const dias = tt?.tiempo_tramite;
    return dias === null || dias === undefined || dias === '' ? '-' : `${dias} días`;
  }

  onTipoDocumentoChange() {
    this.actualizarNumeroInterno();
  }

  private actualizarNumeroInterno() {
    if (!this.tipo_documento || !this.id_empresa) {
      this.n_interno = '';
      this.cdr.detectChanges();
      return;
    }

    const docSel = this.getTipoDocumentoSeleccionado();
    if (!docSel?.nombre) {
      this.n_interno = '';
      this.cdr.detectChanges();
      return;
    }

    const prefijo = String(docSel.nombre).substring(0, 3).toUpperCase();
    this.HistorialtramiteService.getSecuencial(Number(this.tipo_documento), Number(this.id_empresa)).subscribe({
      next: (resp: any) => {
        const anio = resp?.anio;
        const numero = resp?.secuencial;
        if (anio && numero) {
          this.n_interno = `${prefijo}-${anio}-${numero}`;
        } else {
          this.n_interno = '';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.n_interno = '';
        this.cdr.detectChanges();
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

  abrirVistaPrevia() {
    // Validaciones previas
    if (!this.tipo_documento) {
      this.toast.warning('Seleccione el Tipo de Documento antes de la vista previa');
      return;
    }
    if (!this.tipo_tramite) {
      this.toast.warning('Seleccione el Tipo de Trámite antes de la vista previa');
      return;
    }
    if (!this.asunto || !String(this.asunto).trim()) {
      this.toast.warning('Ingrese el Asunto antes de la vista previa');
      return;
    }
    if (!this.usuarios_para || this.usuarios_para.length === 0) {
      this.toast.warning('Debe agregar al menos un destinatario (PARA) antes de la vista previa');
      return;
    }

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
      numero_tramite: this.n_interno || 'S/N',
      tipo_documento_nombre: this.getTipoDocumentoSeleccionado()?.nombre || this.nombre_tipo_documento || 'DOCUMENTO'
    };
  }

  verActas() {
    if (!this.id_tramite_creado) return;

    const modalRef = this.modalService.open(SeguimientoComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static'
    });

    modalRef.componentInstance.id_tramite = this.id_tramite_creado;
    modalRef.componentInstance.tramiteDatos = { num_documento_interno: this.n_interno, asunto_tramite: this.asunto };
    modalRef.componentInstance.areas = [];
    modalRef.componentInstance.soloActas = true;
  }

  async guardar() {
    if (this.guardando) return;

    const destino = this.usuarios_para?.[0]?.id;
    const origen = this.usuarios_de?.[0]?.id;

    if (!origen) {
      this.toast.error('Seleccione al menos un usuario en "De"');
      return;
    }

    if (!destino) {
      this.toast.error('Falta el destinatario. Use "Buscar Usuario", agregue el usuario y en "Colocar como" seleccione "Para", luego "Asignar Usuarios".');
      return;
    }

    if (!this.usuarios_de?.[0]?.tiene_firma) {
      this.toast.error('El usuario que envía (De) no tiene firma electrónica');
      return;
    }

    if (!this.tipo_documento) {
      this.toast.error('Seleccione Tipo de Documento');
      return;
    }

    if (!this.tipo_tramite) {
      this.toast.error('Seleccione Tipo de Trámite');
      return;
    }

    if (!this.n_interno) {
      this.toast.error('No se generó el número de trámite');
      return;
    }

    if (!this.asunto || !this.asunto.trim()) {
      this.toast.error('Ingrese el asunto');
      return;
    }

    this.guardando = true;

    try {
      const actaFile = await this.generarActaPdfFile();

      const formData = new FormData();
      formData.append('id_usuario', String(this.id_usuario));
      formData.append('id_empresa', String(this.id_empresa));
      formData.append('id_tipo_tramite', String(this.tipo_tramite));
      formData.append('id_tipo_documento', String(this.tipo_documento));
      formData.append('num_documento_interno', this.n_interno);
      formData.append('asunto', this.asunto);
      formData.append('folios', String(this.folios || 1));
      formData.append('cuerpo_documento', this.contenidoCuerpo || '');
      formData.append('usuario_update', String(this.id_usuario));
      // Flags de borrador
      formData.append('estado_borrador', '1');
      formData.append('es_borrador', '1');

      // Anexos: acta y archivos seleccionados
      if (actaFile) formData.append('anexos[]', actaFile);
      this.archivos.forEach(f => formData.append('anexos[]', f));

      // Destinatarios en el mismo request (como en AsignarTramiteComponent)
      (this.usuarios_de || []).forEach(u => formData.append('de[]', String(u.id)));
      (this.usuarios_para || []).forEach(u => formData.append('para[]', String(u.id)));
      (this.usuarios_copia || []).forEach(u => formData.append('copia[]', String(u.id)));

      // Guardar como borrador (crea/actualiza y retorna id_tramite si backend lo envía)
      const resp: any = await firstValueFrom(this.HistorialtramiteService.grabarTramite(formData));

      const idTramite = resp?.id_tramite || resp?.tramite?.id_tramite || resp?.tramite?.id || resp?.id || null;
      if (!idTramite) {
        this.toast.error('No se pudo obtener el ID del trámite (borrador)');
        return;
      }
      this.id_tramite_creado = idTramite;

      // No se realiza llamada separada: /recepcion/grabartramite ya guarda destinatarios (de/para/copia)

      this.toast.success('Borrador guardado correctamente');
      this.tramiteC.emit();
      this.activeModal.close();
    } catch (err) {
      this.toast.error('No se pudo crear el trámite');
      console.error(err);
    } finally {
      this.guardando = false;
    }
  }

  async registrarTramiteDefinitivo() {
    if (this.guardando) return;

    // Validaciones mínimas
    const origen = this.usuarios_de?.[0];
    const destino = this.usuarios_para?.[0];
    if (!origen) { this.toast.error('Seleccione al menos un usuario en "De"'); return; }
    if (!destino) { this.toast.error('Falta el destinatario (PARA)'); return; }
    if (!this.tipo_documento) { this.toast.error('Seleccione Tipo de Documento'); return; }
    if (!this.tipo_tramite) { this.toast.error('Seleccione Tipo de Trámite'); return; }
    if (!this.n_interno) { this.toast.error('No se generó el número de trámite'); return; }
    if (!this.asunto || !this.asunto.trim()) { this.toast.error('Ingrese el asunto'); return; }

    this.guardando = true;
    try {
      const actaFile = await this.generarActaPdfFile();
      const formData = new FormData();
      formData.append('id_usuario', String(this.id_usuario));
      formData.append('id_empresa', String(this.id_empresa));
      formData.append('tipo_tramite', String(this.tipo_tramite));
      formData.append('tipo_documento', String(this.tipo_documento));
      formData.append('n_interno', this.n_interno);
      formData.append('asunto', this.asunto);
      formData.append('folios', String(this.folios || 1));

      // anexos definitivos
      if (actaFile) formData.append('archivos[]', actaFile);
      this.archivos.forEach(f => formData.append('archivos[]', f));

      // Destinatarios en el alta definitiva
      (this.usuarios_de || []).forEach(u => formData.append('de[]', String(u.id)));
      (this.usuarios_para || []).forEach(u => formData.append('para[]', String(u.id)));
      (this.usuarios_copia || []).forEach(u => formData.append('copia[]', String(u.id)));

      const resp: any = await firstValueFrom(this.HistorialtramiteService.registrarTramite(formData));
      const idTramite = resp?.id_tramite || resp?.tramite?.id_tramite || resp?.tramite?.id || resp?.id || null;
      if (!idTramite) {
        this.toast.error('No se pudo registrar el trámite');
        return;
      }

      // Crear asignaciones para cada destinatario PARA
      for (const p of (this.usuarios_para || [])) {
        const fd = new FormData();
        fd.append('id_tramite', String(idTramite));
        fd.append('accion', 'DERIVAR');
        if (origen?.id_proyecto) fd.append('id_area_origen', String(origen.id_proyecto));
        fd.append('id_usuario_origen', String(origen.id));
        if (p?.id_proyecto) fd.append('id_area_destino', String(p.id_proyecto));
        fd.append('id_usuario_destino', String(p.id));
        fd.append('usuario_registro', String(origen.id));
        fd.append('descripcion', 'Registro de trámite');
        await firstValueFrom(this.HistorialtramiteService.asginartramite(fd));
      }

      this.toast.success('Trámite registrado y asignado correctamente');
      this.tramiteC.emit();
      this.activeModal.close();
    } catch (err) {
      this.toast.error('Error al registrar el trámite');
      console.error(err);
    } finally {
      this.guardando = false;
    }
  }

  private async crearAsignacionInicial(id_tramite: number): Promise<void> {
    const origen = this.usuarios_de?.[0];
    const destino = this.usuarios_para?.[0];

    const id_area_origen = origen?.id_proyecto;
    const id_area_destino = destino?.id_proyecto;

    if (!id_area_origen || !id_area_destino) {
      return;
    }

    const formData = new FormData();
    formData.append('id_tramite', String(id_tramite));
    formData.append('accion', 'DERIVAR');
    formData.append('id_area_origen', String(id_area_origen));
    formData.append('id_usuario_origen', String(origen.id));
    formData.append('id_area_destino', String(id_area_destino));
    formData.append('id_usuario_destino', String(destino.id));
    formData.append('usuario_registro', String(origen.id));
    formData.append('descripcion', 'Creación de trámite');

    await firstValueFrom(this.HistorialtramiteService.asginartramite(formData));
  }

  private async generarActaPdfFile(): Promise<File> {
    let empresa: any = null;
    let logoBase64: string | null = null;

    if (this.id_empresa) {
      try {
        empresa = await firstValueFrom(this.HistorialtramiteService.cargarempresaidVistaPrevia(Number(this.id_empresa)));
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
    const tipoDocumento = String(this.getTipoDocumentoSeleccionado()?.nombre || this.nombre_tipo_documento || 'DOCUMENTO');
    const numeroTramite = String(this.n_interno || 'S/N');
    const fecha = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });

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
              [{ text: 'PARA:', bold: true, fillColor: '#f3f3f3' }, { text: this.formatLista(this.usuarios_para) }],
              [{ text: 'DE:', bold: true, fillColor: '#f3f3f3' }, { text: this.formatLista(this.usuarios_de) }],
              [{ text: 'COPIA:', bold: true, fillColor: '#f3f3f3' }, { text: this.formatLista(this.usuarios_copia) }],
              [{ text: 'ASUNTO:', bold: true, fillColor: '#f3f3f3' }, { text: this.asunto || 'Sin Asunto' }],
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
            { text: this.formatLista(this.usuarios_de), bold: true, margin: [0, 5, 0, 0] },
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
}
