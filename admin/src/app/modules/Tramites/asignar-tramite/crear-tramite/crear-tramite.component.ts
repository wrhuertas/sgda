import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import htmlToPdfmake from 'html-to-pdfmake';
import pdfMake from 'pdfmake';
import { URL_BACKEND } from 'src/app/config/config';

import { AuthService } from 'src/app/modules/auth';
import { AsignartramiteService } from '../service/asignartramite.service';
import { RegistrarService } from '../../RegistrarTramite/service/registrar.service';
import { BuscarUsuarioComponent } from '../buscar-usuario/buscar-usuario.component';
import { VistaPreviaComponent } from '../vista-previa/vista-previa.component';
import Swal from 'sweetalert2';

/**
 * Creación de un trámite nuevo por memorandum.
 *
 * Es la misma pantalla que RegistrarAsignacionComponent, sin lo que depende de
 * un trámite ya existente: no hay recuadro con los datos del trámite, ni
 * pestaña de seguimiento, ni sumillar, rechazar o finalizar. Acá el trámite
 * recién se está creando, así que no hay nada de eso que mostrar.
 */
@Component({
  selector: 'app-crear-tramite',
  templateUrl: './crear-tramite.component.html',
  styleUrls: ['./crear-tramite.component.scss']
})
export class CrearTramiteComponent implements OnInit {

  @Input() id_usuario: any;
  @Output() tramiteC = new EventEmitter<void>();

  tab_active: number = 1;
  guardando: boolean = false;

  id_empresa: number | null = null;
  usuario_id: number | null = null;

  // ---------- Destinatarios ----------
  usuarios_para: any[] = [];
  usuarios_de: any[] = [];
  usuarios_copia: any[] = [];

  // ---------- Datos del documento ----------
  tipo_documentos: any[] = [];
  tipo_tramites: any[] = [];
  id_tipo_documento_sel: any = null;
  id_tipo_tramite_sel: any = null;
  categoria_sel: string = '';
  numero_documento_input: string = '';
  public numeroMemorandumCompleto: string = '';
  nombre_tipo_documento: string = 'Memorandum';
  asunto: string = '';

  // ---------- Anexos ----------
  archivos: File[] = [];
  anexosDescripcion: string[] = [];

  // ---------- Editor ----------
  public Editor: any = ClassicEditor;
  private editorInstance: any = null;

  /**
   * El cuerpo arranca con la apertura y el cierre de cortesía, que van
   * siempre en un memorandum. Entre los dos queda el espacio donde escribe
   * el usuario.
   */
  public contenidoCuerpo: string =
    '<p>De mi consideración:</p>'
    + '<p>&nbsp;</p>'
    + '<p>&nbsp;</p>'
    + '<p>Con sentimientos de distinguida consideración.</p>';

  public editorConfig = {
    toolbar: [
      'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
      'indent', 'outdent', '|', 'insertTable', 'undo', 'redo'
    ]
  };

  constructor(
    public activeModal: NgbActiveModal,
    public modalService: NgbModal,
    public authService: AuthService,
    public AsignartramiteService: AsignartramiteService,
    private registrarService: RegistrarService,
    private toast: ToastrService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    this.usuario_id = this.id_usuario ?? user?.id ?? null;
    this.id_empresa = user?.id_empresa ?? null;

    if (this.id_empresa) {
      this.cargarTipos(this.id_empresa);
    }

    // El remitente es siempre el usuario logueado, y de sus datos sale el
    // número de memorandum, así que se resuelve al abrir la pantalla
    this.setUsuarioDeFijo();

    if (this.usuario_id) {
      this.DatosLogeado(Number(this.usuario_id));
    }
  }

  changeTab(tab: number) {
    this.tab_active = tab;
    this.cdr.detectChanges();
  }

  // ============================================================
  //  TIPOS DE DOCUMENTO Y DE TRÁMITE
  // ============================================================

  /**
   * Como el trámite es nuevo, no hay valores previos que respetar: se deja
   * "Memorando" preseleccionado, que es el caso de esta pantalla.
   */
  private cargarTipos(idEmpresa: number) {
    this.registrarService.configtipo(idEmpresa).subscribe({
      next: (resp: any) => {
        const arr = resp?.tipo_documentos || resp?.data || resp || [];
        this.tipo_documentos = Array.isArray(arr) ? arr : [];

        const mem = this.tipo_documentos.find(
          (td: any) => String(td?.nombre || '').toLowerCase().includes('memor')
        );

        if (mem?.id_tipodocumento) {
          this.id_tipo_documento_sel = mem.id_tipodocumento;
          this.nombre_tipo_documento = mem.nombre;
        }

        this.cdr.detectChanges();
      },
      error: () => { this.tipo_documentos = []; }
    });

    this.registrarService.configtipotramite(idEmpresa).subscribe({
      next: (resp: any) => {
        const arr = resp?.tipo_tramites || resp?.data || resp || [];
        this.tipo_tramites = Array.isArray(arr) ? arr : [];
        this.cdr.detectChanges();
      },
      error: () => { this.tipo_tramites = []; }
    });
  }

  /** Un trámite creado por memorandum no puede ser Oficio */
  onTipoDocumentoChange(id: any) {
    const td = this.tipo_documentos.find((t: any) => String(t?.id_tipodocumento) === String(id));
    const nombre = String(td?.nombre || '').toLowerCase();

    if (nombre.includes('oficio')) {
      this.toast.warning('Este trámite no puede ser Oficio');

      const mem = this.tipo_documentos.find(
        (x: any) => String(x?.nombre || '').toLowerCase().includes('memor')
      );

      if (mem?.id_tipodocumento) {
        this.id_tipo_documento_sel = mem.id_tipodocumento;
      }
    } else {
      this.nombre_tipo_documento = td?.nombre || this.nombre_tipo_documento;
    }

    this.cdr.detectChanges();
  }

  // ============================================================
  //  DESTINATARIOS
  // ============================================================

  BuscarUsuario() {
    const modalRef = this.modalService.open(BuscarUsuarioComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.componentInstance.id_usuario = this.usuario_id;
    modalRef.componentInstance.id_empresa = this.id_empresa;

    // Se manda lo ya elegido para poder editarlo en vez de empezar de cero
    modalRef.componentInstance.personasIniciales = [
      ...this.usuarios_de.map(u => ({ ...u, rol_envio: 'DE' })),
      ...this.usuarios_para.map(u => ({ ...u, rol_envio: 'PARA' })),
      ...this.usuarios_copia.map(u => ({ ...u, rol_envio: 'COPIA' })),
    ];

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

    // El remitente vuelve a fijarse: el buscador pudo haber devuelto la lista
    // sin el usuario logueado o sin su rol bloqueado
    this.setUsuarioDeFijo();
    this.cdr.detectChanges();
  }

  /**
   * Deja al usuario logueado como remitente fijo en "De".
   *
   * Si ya hay alguien en esa lista no se reconstruye, sólo se marca el rol:
   * rehacerla borraría el título, el área y la institución que trae
   * DatosLogeado, que no están en el localStorage.
   */
  private setUsuarioDeFijo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const id = this.usuario_id ?? user?.id ?? null;

    if (!id) { return; }

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
        `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim()
    ).trim() || 'Usuario';

    const titulo = String(user?.titulo || user?.title || user?.cargo || user?.puesto || '').trim();
    const subseccion = String(
      user?.subseccion || user?.area_nombre || user?.departamento || user?.seccion || ''
    ).trim();

    const entrada: any = {
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

    this.usuarios_de = [entrada];

    const idEmpresa = this.id_empresa ?? user?.id_empresa ?? null;

    if (!entrada.empresa && idEmpresa) {
      this.AsignartramiteService.cargarempresaid(Number(idEmpresa)).subscribe({
        next: (empresaResp: any) => {
          entrada.empresa = empresaResp?.nombre_empresa || entrada.empresa || 'Sin Empresa';
          this.cdr.detectChanges();
        },
        error: () => this.cdr.detectChanges()
      });
    }
  }

  // ============================================================
  //  DATOS DEL REMITENTE Y NÚMERO DE MEMORANDUM
  // ============================================================

  /**
   * Completa los datos del remitente y arma el número de memorandum.
   *
   * El número se forma con las siglas de la empresa y de los proyectos, el
   * año y un secuencial que da el backend:
   *   SIGLA_EMPRESA-SIGLA_RAIZ-SIGLA_ACTUAL-AÑO-####-M
   */
  DatosLogeado(id_usuario: number): void {
    this.AsignartramiteService.datosLogeado(id_usuario).subscribe({
      next: (resp: any) => {
        if (!resp || !Array.isArray(this.usuarios_de) || this.usuarios_de.length === 0) {
          return;
        }

        const de = this.usuarios_de[0];

        if (typeof resp.tiene_firma !== 'undefined') { de.tiene_firma = !!resp.tiene_firma; }
        if (resp.titulo_usuario) { de.titulo = resp.titulo_usuario; }
        if (resp.proyecto_actual) { de.area = resp.proyecto_actual; }
        if (resp.nombre_proyecto_raiz) { de.subseccion = resp.nombre_proyecto_raiz; }
        if (resp.empresa) { de.institucion = resp.empresa; }
        if (resp.sigla_usuario) { de.sigla = resp.sigla_usuario; }

        this.armarNumeroMemorandum(resp);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('DatosLogeado - error del servicio:', err);
      }
    });
  }

  /** Pide el secuencial y deja armado el número completo */
  private armarNumeroMemorandum(resp: any): void {
    const siglaEmpresa = String(resp.sigla || resp.sigla_empresa || '').trim();
    const siglaRaiz = String(resp.sigla_proyecto_raiz || '').trim();
    const siglaActual = String(resp.sigla_proyecto_actual || '').trim();
    const anio = new Date().getFullYear();
    const idEmpresa = this.id_empresa ?? resp.id_empresa ?? null;

    const partes: string[] = [];

    if (siglaEmpresa) { partes.push(siglaEmpresa); }
    if (siglaRaiz) { partes.push(siglaRaiz); }

    // La sigla del proyecto actual sólo se agrega si es distinta de la raíz,
    // si no el número quedaría con la misma sigla repetida
    if (siglaActual && siglaActual !== siglaRaiz) { partes.push(siglaActual); }

    partes.push(String(anio));

    const prefijo = partes.join('-');

    if (!idEmpresa || !prefijo) {
      this.numero_documento_input = `${prefijo || 'SIN-PREFIJO'}-0001-M`;
      this.numeroMemorandumCompleto = this.numero_documento_input;
      this.cdr.detectChanges();
      return;
    }

    this.AsignartramiteService.getSecuencialMemorandumRecepcion(Number(idEmpresa), prefijo).subscribe({
      next: (r: any) => {
        const secuencial = String(r?.secuencial || '0001').padStart(4, '0');
        this.numero_documento_input = `${prefijo}-${secuencial}-M`;
        this.numeroMemorandumCompleto = this.numero_documento_input;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('getSecuencialMemorandumRecepcion - error:', err);
        // Sin secuencial se arranca en 0001 para no dejar el número vacío
        this.numero_documento_input = `${prefijo}-0001-M`;
        this.numeroMemorandumCompleto = this.numero_documento_input;
        this.cdr.detectChanges();
      }
    });
  }

  // ============================================================
  //  ANEXOS
  // ============================================================

  onFilesSelected(event: any) {
    const files: FileList | null = event?.target?.files || null;
    if (!files || files.length === 0) { return; }

    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
    const permitidas = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = (f.name || '').toLowerCase().split('.').pop() || '';

      if (!permitidas.includes(ext)) {
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

    // Se limpia para poder volver a elegir el mismo archivo
    event.target.value = '';
  }

  removeFile(index: number) {
    this.archivos.splice(index, 1);
    this.anexosDescripcion.splice(index, 1);
  }

  private getExt(file: File): string {
    const name = (file?.name || '').toLowerCase();
    return name.includes('.') ? name.substring(name.lastIndexOf('.') + 1) : '';
  }

  getFileColor(file: File): string {
    const ext = this.getExt(file);
    if (ext === 'pdf') { return 'text-danger'; }
    if (ext === 'doc' || ext === 'docx') { return 'text-primary'; }
    if (ext === 'xls' || ext === 'xlsx') { return 'text-success'; }
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) { return 'text-warning'; }
    return 'text-gray-500';
  }

  getFileBadgeClass(file: File): string {
    const ext = this.getExt(file);
    if (ext === 'pdf') { return 'badge-light-danger'; }
    if (ext === 'doc' || ext === 'docx') { return 'badge-light-primary'; }
    if (ext === 'xls' || ext === 'xlsx') { return 'badge-light-success'; }
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) { return 'badge-light-warning'; }
    return 'badge-light';
  }

  getFileLabel(file: File): string {
    return this.getExt(file).toUpperCase() || 'FILE';
  }

  // ============================================================
  //  EDITOR
  // ============================================================

  onEditorReady(editor: any) {
    this.editorInstance = editor;
    // El contenido inicial se sincroniza a mano: el editor se crea después
    // de que Angular resolvió el ngModel y si no arranca vacío
    try { this.editorInstance.setData(this.contenidoCuerpo || ''); } catch {}
  }

  // ============================================================
  //  VISTA PREVIA Y CREACIÓN
  // ============================================================

  abrirVistaPrevia() {
    const modalRef = this.modalService.open(VistaPreviaComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static'
    });

    const normalizar = (arr: any[] | undefined) => (Array.isArray(arr) ? arr : []).map(u => ({
      id: u?.id ?? null,
      sigla: String(u?.sigla || u?.sigla_usuario || '').trim(),
      nombre_completo: String(u?.nombre_completo || `${u?.nombre || ''} ${u?.apellido || ''}`.trim()).trim(),
      titulo: String(u?.titulo || u?.titulo_usuario || u?.cargo || '').trim(),
      puesto: String(u?.puesto || u?.area || u?.proyecto || u?.seccion || u?.subseccion || '').trim(),
      seccion: String(u?.subseccion || u?.seccion || '').trim()
    }));

    const numeroMemorandum = (this.numero_documento_input || '').trim()
      || this.numeroMemorandumCompleto
      || '';

    modalRef.componentInstance.data = {
      asunto: this.asunto,
      cuerpo: this.contenidoCuerpo,
      para: normalizar(this.usuarios_para),
      de: normalizar(this.usuarios_de),
      copia: normalizar(this.usuarios_copia),
      // La vista previa lee esta clave; con otro nombre muestra "S/N"
      num_documento_interno: numeroMemorandum,
      tipo_documento_nombre: this.nombre_tipo_documento || 'Memorando',
      // Los anexos que se estén adjuntando, agrupados bajo este memorandum
      grupos_anexos: this.archivos.length
        ? [{
            titulo: `Anexos de ${this.nombre_tipo_documento || 'Memorando'}: ${numeroMemorandum || 'S/N'}`,
            nombres: this.archivos.map(f => f?.name).filter((n: any) => !!n)
          }]
        : [],
      anexos_nombres: this.archivos.map(f => f?.name).filter((n: any) => !!n)
    };
  }

  // ============================================================
  //  ACTA EN PDF
  //  El acta se arma acá, en el navegador, con el mismo diseño de la vista
  //  previa. El backend sólo la recibe, la firma y la guarda.
  // ============================================================

  /** Dónde cayó el bloque de firma al maquetar, en milímetros */
  private posicionFirmaActa: { pagina: number; x: number; y: number } | null = null;

  /** Descarga una imagen y la pasa a base64, si el backend no la mandó así */
  private async urlABase64(url: string): Promise<string | null> {
    let direccion = String(url || '').trim();

    if (!direccion) { return null; }

    if (!/^https?:\/\//i.test(direccion)) {
      const base = String(URL_BACKEND || '').replace(/\/+$/, '');
      direccion = `${base}/${direccion.replace(/^\/+/, '')}`;
    }

    try {
      const blob = await firstValueFrom(
        this.http.get(direccion, { responseType: 'blob' as 'blob' })
      );

      return await new Promise<string>((resolve) => {
        const lector = new FileReader();
        lector.onloadend = () => resolve(lector.result as string);
        lector.readAsDataURL(blob as Blob);
      });
    } catch {
      return null;
    }
  }

  /** 'N/A' y 'Sin Proyecto' son rellenos del backend: para el PDF son vacío */
  private limpiarTexto(valor: any): string {
    const texto = String(valor ?? '').trim();

    if (!texto) { return ''; }

    const comparable = texto.toUpperCase();
    return (comparable === 'N/A' || comparable === 'SIN PROYECTO') ? '' : texto;
  }

  /** Separa el nombre de la línea de título / puesto / sección */
  private partesUsuario(u: any): { main: string; extras: string } {
    const sigla = String(u?.sigla || u?.sigla_usuario || '').trim();
    const nombre = String(u?.nombre_completo || `${u?.nombre || ''} ${u?.apellido || ''}`.trim() || u?.name || '').trim();
    const titulo = this.limpiarTexto(u?.titulo) || this.limpiarTexto(u?.titulo_usuario);
    const puesto = this.limpiarTexto(u?.puesto) || this.limpiarTexto(u?.area)
      || this.limpiarTexto(u?.proyecto) || this.limpiarTexto(u?.seccion) || this.limpiarTexto(u?.subseccion);
    const seccionCruda = this.limpiarTexto(u?.seccion) || this.limpiarTexto(u?.subseccion);
    const seccion = seccionCruda === puesto ? '' : seccionCruda;

    if (!nombre) { return { main: '', extras: '' }; }

    const main = [sigla, nombre].filter(x => !!x).join(' ').trim();

    const partes: string[] = [];
    if (titulo) { partes.push(titulo); }

    const puestoSeccion = [puesto, seccion].filter(x => !!x).join(' / ');
    if (puestoSeccion) { partes.push(puestoSeccion); }

    return { main, extras: partes.join(' — ') };
  }

  /** Para pdfMake: el título y la sección van en negrilla */
  private formatListaRich(usuarios: any[]): any {
    if (!usuarios || usuarios.length === 0) { return 'No asignado'; }

    const runs: any[] = [];

    usuarios.forEach(u => {
      const { main, extras } = this.partesUsuario(u);
      if (!main) { return; }
      if (runs.length > 0) { runs.push({ text: '\n\n' }); }
      runs.push({ text: main });
      if (extras) { runs.push({ text: `\n${extras}`, bold: true }); }
    });

    return runs.length > 0 ? runs : 'No asignado';
  }

  private formatLista(usuarios: any[]): string {
    if (!usuarios || usuarios.length === 0) { return 'No asignado'; }

    return usuarios
      .map(u => {
        const { main, extras } = this.partesUsuario(u);
        if (!main) { return ''; }
        return extras ? `${main}\n${extras}` : main;
      })
      .filter(v => !!v)
      .join('\n\n') || 'No asignado';
  }

  /** Anexos agrupados bajo el memorandum que se está creando */
  private construirGruposAnexos(numeroMemorandum: string): { titulo: string; nombres: string[] }[] {
    const nombres = this.archivos.map(f => String(f?.name || '').trim()).filter(n => !!n);

    if (nombres.length === 0) { return []; }

    const tipo = String(this.nombre_tipo_documento || 'Memorando').trim();

    return [{
      titulo: `Anexos de ${tipo}: ${numeroMemorandum || 'S/N'}`,
      nombres
    }];
  }

  /**
   * Arma el acta en PDF con el mismo diseño de la vista previa: cabecera,
   * logo, destinatarios, cuerpo y anexos. Devuelve el archivo listo para
   * mandar al backend, que lo firma y lo guarda.
   */
  private async generarActaPdfFile(options?: { borrador?: boolean }): Promise<File> {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const idEmpresa = user?.id_empresa ?? this.id_empresa ?? null;

    let empresa: any = null;
    let logoBase64: string | null = null;
    let cabeceraBase64: string | null = null;
    let pieBase64: string | null = null;

    if (idEmpresa) {
      try {
        empresa = await firstValueFrom(this.AsignartramiteService.cargarempresaidVistaPrevia(idEmpresa));

        // El endpoint ya devuelve las imágenes en base64, así se evita el CORS
        logoBase64 = empresa?.imagen_empresa_base64 ?? null;
        cabeceraBase64 = empresa?.imagen_cabecera_base64 ?? null;
        pieBase64 = empresa?.imagen_pie_pagina_base64 ?? null;

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
        // Si fallan las imágenes no se pierden los datos de la empresa
        console.error('[CrearTramite] No se pudo cargar la empresa para el acta:', e);
      }
    }

    const htmlContent = (htmlToPdfmake as any)(this.contenidoCuerpo || '', { window });
    const tipoDocumento = String(this.nombre_tipo_documento || 'DOCUMENTO');
    const numeroDocumento = String(
      (this.numero_documento_input && this.numero_documento_input.trim())
      || this.numeroMemorandumCompleto
      || 'S/N'
    );

    const fecha = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    const nombreEmpresa = String(empresa?.nombre_empresa || '').trim();
    const ciudadEmpresa = String(empresa?.ciudad || '').trim();
    const ciudadFecha = ciudadEmpresa ? `${ciudadEmpresa}, ${fecha}` : fecha;

    // La cabecera y el pie sólo van como imagen si la empresa lo configuró así
    const cabeceraImg = (cabeceraBase64 && empresa?.si_cabecera === 1) ? cabeceraBase64 : null;
    const pieImg = (pieBase64 && empresa?.si_pie_pagina === 1) ? pieBase64 : null;

    const bloquesAnexos: any[] = [];

    this.construirGruposAnexos(numeroDocumento).forEach(grupo => {
      if (grupo.nombres.length === 0) { return; }
      bloquesAnexos.push({ text: `\n${grupo.titulo}`, style: 'label', margin: [0, 12, 0, 6] });
      bloquesAnexos.push({ ul: grupo.nombres, fontSize: 9 });
    });

    // pdfMake informa la posición de cada nodo mientras maqueta: con el nodo
    // ancla se sabe dónde queda el espacio reservado para la firma
    let posicionFirma: any = null;
    let firmaYaMovida = false;

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [20, 100, 20, 100],
      ...(options?.borrador
        ? { watermark: { text: 'BORRADOR', color: '#e3342f', opacity: 0.08, bold: true, fontSize: 55 } }
        : {}),
      pageBreakBefore: (currentNode: any, followingNodesOnPage: any[]) => {
        if (currentNode?.id === 'anclaFirma' && currentNode?.startPosition) {
          posicionFirma = currentNode.startPosition;
        }

        // "Atentamente," tiene que quedar junto al nombre del firmante
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
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              text: (empresa?.texto_cabecera && empresa?.si_cabecera === 0) ? String(empresa.texto_cabecera || '') : '',
              alignment: 'center', style: 'empresa', margin: [0, 0, 0, 10]
            },
            { width: '*', text: '' }
          ]
        },
        {
          columns: [
            { width: '*', text: '' },
            logoBase64
              ? { width: 'auto', stack: [{ image: logoBase64, width: 100, alignment: 'center' }] }
              : { width: 'auto', text: '' },
            { width: '*', text: '' }
          ]
        },
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
                { width: '*', text: this.formatListaRich(this.usuarios_para), style: 'value' }
              ],
              columnGap: 8
            },
            {
              columns: [
                { width: 55, text: 'De:', style: 'label' },
                { width: '*', text: this.formatListaRich(this.usuarios_de), style: 'value' }
              ],
              columnGap: 8,
              margin: [0, 4, 0, 0]
            },
            ...(this.usuarios_copia.length > 0 ? [
              {
                columns: [
                  { width: 55, text: 'Copia:', style: 'label' },
                  { width: '*', text: this.formatListaRich(this.usuarios_copia), style: 'value' }
                ],
                columnGap: 8,
                margin: [0, 4, 0, 0]
              }
            ] : []),
            { text: '\n' },
            {
              columns: [
                { width: 55, text: 'Asunto:', style: 'label' },
                { width: '*', text: String(this.asunto || 'Sin Asunto'), style: 'value' }
              ],
              columnGap: 8,
              margin: [0, 4, 0, 0]
            }
          ]
        },

        { text: '\n' },

        htmlContent,

        // Cierre y espacio reservado para la firma electrónica
        { text: '\n\nAtentamente,', id: 'bloqueFirma', margin: [0, 100, 0, 0] },
        { text: ' ', id: 'anclaFirma', margin: [0, 0, 0, 55] },
        { text: this.formatLista(this.usuarios_de), id: 'firmante', bold: true },
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

        const partes = [direccion, telefono, textoPie].filter(p => !!p);

        if (partes.length === 0) { return null; }

        return {
          columns: [
            { width: '*', text: '' },
            { width: 'auto', stack: partes.map(p => ({ text: p, fontSize: 9, color: '#444', alignment: 'center' })) },
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

    // pdfMake trabaja en puntos; el backend firma en milímetros
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

    // El backend reconoce que es un acta por el nombre del archivo
    return new File([blob], `ACTA_${numeroDocumento}.pdf`, { type: 'application/pdf' });
  }

  /** Sin destinatario en "Para" no hay a quién dirigir el trámite */
  isCrearDisabled(): boolean {
    return this.guardando || this.usuarios_para.length === 0;
  }

  async confirmarCreacion(): Promise<void> {
    if (!this.asunto || !this.asunto.trim()) {
      this.toast.warning('Ingrese el asunto del trámite');
      return;
    }

    if (this.usuarios_para.length === 0) {
      this.toast.warning('Seleccione al menos un destinatario en "Para"');
      return;
    }

    const confirmacion = await Swal.fire({
      title: '¿Crear el trámite?',
      html: `Se enviará a <b>${this.usuarios_para.length}</b> destinatario(s) con el memorandum `
            + `<b>${this.numero_documento_input || 'S/N'}</b>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, crear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6'
    });

    if (!confirmacion.isConfirmed) { return; }

    this.guardando = true;

    // El acta se arma acá y viaja como un archivo más; el backend la firma
    let actaFile: File;

    try {
      actaFile = await this.generarActaPdfFile();
    } catch (e) {
      this.guardando = false;
      console.error('No se pudo generar el acta:', e);
      this.toast.error('No se pudo generar el acta del memorandum');
      return;
    }

    const datos = new FormData();

    datos.append('asunto', this.asunto);
    datos.append('cuerpo_documento', this.contenidoCuerpo || '');
    datos.append('num_documento_interno', this.numero_documento_input || '');
    datos.append('categoria', this.categoria_sel || '');

    if (this.id_tipo_documento_sel) { datos.append('id_tipo_documento', String(this.id_tipo_documento_sel)); }
    if (this.id_tipo_tramite_sel) { datos.append('id_tipo_tramite', String(this.id_tipo_tramite_sel)); }

    // Destinatarios por rol
    this.usuarios_para.forEach(u => datos.append('para[]', String(u.id)));
    this.usuarios_copia.forEach(u => datos.append('copia[]', String(u.id)));
    this.usuarios_de.forEach(u => datos.append('de[]', String(u.id)));

    // El acta se firma con el certificado del remitente, si lo tiene vigente
    const remitente = this.usuarios_de[0];

    datos.append('firmar_acta', remitente?.tiene_firma ? '1' : '0');

    if (remitente?.tiene_firma) {
      datos.append('id_usuario_firma', String(remitente.id));
    }

    // Dónde estampar la firma visual: justo bajo "Atentamente,"
    if (this.posicionFirmaActa) {
      datos.append('firma_pagina', String(this.posicionFirmaActa.pagina));
      datos.append('firma_x_mm', String(this.posicionFirmaActa.x));
      datos.append('firma_y_mm', String(this.posicionFirmaActa.y));
    }

    // El acta va primero, con descripción vacía, para que los índices de
    // archivos[] y anexos_descripcion[] queden alineados
    datos.append('archivos[]', actaFile);
    datos.append('anexos_descripcion[]', '');

    this.archivos.forEach((archivo, i) => {
      datos.append('archivos[]', archivo);
      datos.append('anexos_descripcion[]', this.anexosDescripcion[i] || '');
    });

    this.AsignartramiteService.crearTramite(datos).subscribe({
      next: (resp: any) => {
        this.guardando = false;

        if (resp?.success) {
          this.toast.success(resp.message || 'Trámite creado correctamente');
          this.tramiteC.emit();
          this.activeModal.close(true);
        } else {
          this.toast.error(resp?.message || 'No se pudo crear el trámite');
        }
      },
      error: (err: any) => {
        this.guardando = false;
        console.error('crearTramite - error:', err);
        this.toast.error(err?.error?.message || 'No se pudo crear el trámite');
      }
    });
  }
}
