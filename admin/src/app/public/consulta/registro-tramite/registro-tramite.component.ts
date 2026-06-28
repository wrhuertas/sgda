import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as htmlToPdfmake from 'html-to-pdfmake';
import { URL_SERVICIOS } from 'src/app/config/config';

@Component({
  selector: 'app-registro-tramite-publico',
  templateUrl: './registro-tramite.component.html'
})
export class RegistroTramiteComponent implements OnInit {
  api = environment.apiUrl ?? '/api';
  private readonly backendUrl = URL_SERVICIOS; // URL absoluta al backend (evita 404 en :4200)
  // Empresa objetivo para configuración pública
  private readonly empresaId = 2;

  // Modelo
  n_documento = '';
  nombre = '';
  celular = '';
  email = '';
  direccion = '';
  tipo_tramite: any = '';
  tipo_documento: any = '';
  n_interno = '';
  asunto = '';
  // Archivos por modo (independientes entre sí)
  archivoElectronico: File | null = null; // 1 PDF firmado
  archivoFisico: File | null = null;      // 1 PDF escaneado
  folios = 0;
  foliosBloqueado = true;
  foliosCalculando = false;
  declaracion = false;
  tipoDocumentoBloqueado = false;
  // Resultado de búsqueda de cliente
  private id_cliente: number | null = null;
  clienteNoEncontrado = false;
  permitirEdicion = false; // habilita edición de datos del remitente
  private secuencialBase = '000001'; // compat: no se usa luego de tener backend
  private nextSecuencial = 1; // próximo secuencial por cliente
  n_tramite_siguiente = '';
  mostrarNumeroTramite = false; // solo mostrar después de consultar/registrar cliente
  private secuencialDocNext = 1; // próximo secuencial para Nº Documento Interno

  tipo_tramites: any[] = [];
  tipo_documentos: any[] = [];

  esCliente = true; // público externo -> se asume cliente

  loading = false;
  message = '';
  // Modo de ajuste de archivo: 'acta' muestra solo botón; 'electronico' permite subir
  // BUSCA ESTA LÍNEA Y CÁMBIALA:
  modoAjuste: 'acta' | 'electronico' | 'fisico' = 'electronico';
  showActaModal = false;
  actaHtml: string = '';
  actaPdfUrl: SafeResourceUrl | null = null;
  public Editor: any = ClassicEditor;
  public contenidoCuerpo: string = `
    <p>De mi consideración:</p>
    <p>&nbsp;</p>
    <p>&nbsp;</p>
    <p>Con sentimientos de distinguida consideración.</p>
  `;
  public editorConfig: any = { language: 'es' };
  anexos: File[] = [];
  descripcionesAnexos: string[] = [];

  ciudad: string = '';
  fecha: string = '';

  @ViewChild('inpElec', { static: false }) inpElec!: ElementRef<HTMLInputElement>;
  @ViewChild('inpFis', { static: false }) inpFis!: ElementRef<HTMLInputElement>;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.cargarTipos();
  }

  // Resetea el file input al hacer click para forzar el evento change incluso si reelige el mismo archivo
  resetFilePicker(ev: any) {
    try { ev.target.value = '' } catch {}
  }

  onEditorReady(_: any) {}

  async setModoAjuste(next: 'acta' | 'electronico' | 'fisico') {
    if (next === this.modoAjuste) return;
    // Confirmaciones cruzadas cuando hay archivos en el modo opuesto
    if (next === 'acta' && (this.archivoElectronico || this.archivoFisico)) {
      const res = await Swal.fire({
        icon: 'warning',
        title: 'Cambiar a Acta',
        text: 'Si elige crear un Acta se borrarán las selecciones de Documento Electrónico y Físico. ¿Desea continuar?',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });
      if (!res.isConfirmed) return;
      this.archivoElectronico = null;
      this.archivoFisico = null;
    }
    if (next === 'electronico' && this.archivoFisico) {
      const res = await Swal.fire({
        icon: 'warning',
        title: 'Cambiar a Documento Electrónico',
        text: 'Si elige subir un documento electrónico se borrará la selección de Físico. ¿Desea continuar?',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });
      if (!res.isConfirmed) return;
      this.archivoFisico = null;
    }
    if (next === 'fisico' && this.archivoElectronico) {
      const res = await Swal.fire({
        icon: 'warning',
        title: 'Cambiar a Documento Físico',
        text: 'Si elige subir un documento físico se borrará la selección de Electrónico. ¿Desea continuar?',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });
      if (!res.isConfirmed) return;
      this.archivoElectronico = null;
    }
    // Cambiar modo
    this.modoAjuste = next;
    try { this.cdr.detectChanges(); } catch {}
  }

  private getNombreTipoTramite(): string {
    const sel = this.tipo_tramites?.find((t: any) => String(t.id_tipo_tramite) === String(this.tipo_tramite));
    return sel?.nombre || 'Trámite';
  }

  private buildActaHtml(): string {
    const fecha = new Date();
    const fechaStr = fecha.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    const nombreTramite = this.getNombreTipoTramite();
    const numeroDocumento = this.n_interno || this.n_tramite_siguiente || '—';
    const asunto = (this.asunto || '').trim() || '—';
    const solicitante = (this.nombre || '').trim() || '—';

    // HTML simple imprimible
    return `
      <style>
        .acta { font-family: Arial, sans-serif; color:#111; }
        .acta h1 { font-size: 20px; margin: 0 0 8px; }
        .acta h2 { font-size: 16px; margin: 0 0 16px; color:#444; }
        .acta .row { margin: 6px 0; }
        .acta .label { font-weight: bold; color:#333; min-width: 180px; display:inline-block; }
        .acta .value { color:#111; }
        .acta .section { margin-top: 18px; padding-top: 12px; border-top: 1px solid #ddd; }
      </style>
      <div class="acta">
        <h1>Acta de ${nombreTramite}</h1>
        <h2>Número de Documento: ${numeroDocumento}</h2>
        <div class="row"><span class="label">Fecha:</span> <span class="value">${fechaStr}</span></div>
        <div class="row"><span class="label">Solicitante:</span> <span class="value">${solicitante}</span></div>
        <div class="section">
          <div class="label">Asunto</div>
          <div class="value" style="white-space: pre-wrap;">${this.escapeHtml(asunto)}</div>
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

   private buildHeaderHtml(): string {
     const asunto = (this.asunto || '').toString().trim() || 'Sin Asunto';
     return `
      <p>&nbsp;</p>
       <p>Señores:</p>
       <p>INSTITUCIÓN GAD - PROVINCIA DE COTOPAXI</p>
       <p>Presente.</p>
       <p><strong>Asunto:</strong> ${this.escapeHtml(asunto)}</p>
       <p>&nbsp;</p>
     `;
   }

  openActaModal() {
    // Generar PDF y luego abrir modal
    this.generarPDFActa();
  }

  closeActaModal() {
    this.showActaModal = false;
    try { this.cdr.detectChanges(); } catch {}
  }

  verActaEnNuevaPestana() {
    try {
      const url: any = this.actaPdfUrl;
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        Swal.fire({ icon: 'info', title: 'Abrir vista', text: 'Permita ventanas emergentes para ver el Acta.' });
      } else {
        try { (win as any).opener = null; } catch {}
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo abrir', text: 'Ocurrió un problema al abrir la vista del Acta.' });
    }
  }

  // Genera un PDF del Acta y expone una URL segura para previsualizar
  async generarPDFActa() {
    try {
      // Inicializar fuentes virtuales de pdfMake una vez
      (pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;

      // Cargar logo como base64
      let logoBase64 = '';
      try {
        logoBase64 = await this.cargarImagenBase64('assets/logo_cotopaxi.png');
      } catch {
        console.warn('No se pudo cargar el logo');
      }

      // Encabezado fijo requerido: OFICIO
      const tipoDocumento = 'OFICIO';
      const numeroTramite = String(this.n_interno || this.n_tramite_siguiente || 'S/N');
      // Tomar SOLO la fecha seleccionada por el usuario; si no hay, no mostrar
      const fechaInput = (this.fecha || '').toString().trim();
      let fecha = '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaInput)) {
        const d = new Date(fechaInput + 'T00:00:00');
        fecha = d.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
      } else {
        fecha = '';
      }

      const baseHtml = (this.contenidoCuerpo && this.contenidoCuerpo.trim()) ? this.contenidoCuerpo : '<p>Sin contenido</p>';
      const cuerpoConEncabezado = this.buildHeaderHtml() + baseHtml;
      const htmlContent: any = (htmlToPdfmake as any)(cuerpoConEncabezado, { window });
      // Línea Ciudad, fecha (debajo del número de trámite)
      const ciudadTxt = (this.ciudad || '').toString().trim();
      const fechaLinea = (/^\d{4}-\d{2}-\d{2}$/.test((this.fecha || '').toString().trim()))
        ? (() => { const d = new Date(this.fecha + 'T00:00:00'); return d.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' }); })()
        : '';
      const ciudadFechaLine = ciudadTxt && fechaLinea ? `${ciudadTxt}, ${fechaLinea}` : (ciudadTxt || fechaLinea);

      // Construir bloque de anexos solo en modo 'acta'
      const anexosItems = (this.modoAjuste === 'acta' && this.anexos?.length)
        ? this.anexos.map((f, i) => {
            const desc = (this.descripcionesAnexos?.[i] || '').toString().trim();
            return desc ? `${i + 1}. ${desc}` : `${i + 1}. ${f.name}`;
          })
        : [];

      const solicitante = (this.nombre || 'Ciudadano').toString().trim();
      const docIdent = (this.n_documento || '').toString().trim();

      const contentArray: any[] = [];
      
      // Agregar logo si se cargó correctamente
      if (logoBase64) {
        contentArray.push({
          image: logoBase64,
          width: 150,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        });
      }

      // Agregar número de trámite y ciudad/fecha
      contentArray.push({
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            stack: [
              { text: `${tipoDocumento} Nro. ${numeroTramite}`, style: 'docNumber', alignment: 'right' },
              ...(ciudadFechaLine ? [{ text: ciudadFechaLine, style: 'docDate', alignment: 'right', margin: [0, 4, 0, 0] }] : [])
            ]
          }
        ]
      });

      // Agregar contenido HTML
      contentArray.push(htmlContent);

      // Agregar anexos si existen
      if (anexosItems.length) {
        contentArray.push({ text: '\n' });
        contentArray.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 10, 0, 10] });
        contentArray.push({ text: 'Anexos', style: 'label', margin: [0, 0, 0, 6] });
        contentArray.push({ ul: anexosItems, margin: [0, 0, 0, 0] });
      }

      // Agregar firma final
      contentArray.push({ text: '\n\nAtentamente,\n\n', margin: [0, 20, 0, 0] });
      contentArray.push({ text: solicitante, bold: true });
      if (docIdent) {
        contentArray.push({ text: `C.I. ${docIdent}`, color: '#374151', fontSize: 10 });
      }

       const docDefinition: any = {
         pageSize: 'A4',
         pageMargins: [40, 40, 40, 60],
         content: contentArray,
         styles: {
           docNumber: { fontSize: 11, bold: true, color: '#111827' },
           docDate: { fontSize: 9.5, color: '#374151' },
           label: { fontSize: 10, bold: true, color: '#111827' },
         }
       };

      const pMake: any = pdfMake;
      const pdfDoc = pMake.createPdf(docDefinition);
      pdfDoc.getBlob((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        this.actaPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.showActaModal = true;
        try { this.cdr.detectChanges(); } catch {}
      });
    } catch (err) {
      console.error('Error al generar PDF de Acta:', err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el PDF del Acta.' });
    }
  }

  // Función auxiliar para cargar imagen y convertirla a base64
  private cargarImagenBase64(ruta: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('No se pudo obtener contexto del canvas'));
        }
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = ruta;
    });
  }

  // DocDefinition reutilizable para envío del Acta
  private async generarDocDefinitionActaParaEnvio() {
    // Reutilizamos la misma construcción que la vista previa
    // Encabezado fijo requerido: OFICIO
    
    // Cargar logo como base64
    let logoBase64 = '';
    try {
      logoBase64 = await this.cargarImagenBase64('assets/logo_cotopaxi.png');
    } catch {
      console.warn('No se pudo cargar el logo');
    }

    const tipoDocumento = 'OFICIO';
    const numeroTramite = String(this.n_interno || this.n_tramite_siguiente || 'S/N');
    const fechaInput2 = (this.fecha || '').toString().trim();
    let fecha = '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaInput2)) {
      const d = new Date(fechaInput2 + 'T00:00:00');
      fecha = d.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    } else {
      fecha = '';
    }
    const baseHtml = (this.contenidoCuerpo && this.contenidoCuerpo.trim()) ? this.contenidoCuerpo : '<p>Sin contenido</p>';
    const cuerpoConEncabezado = this.buildHeaderHtml() + baseHtml;
    const htmlContent: any = (htmlToPdfmake as any)(cuerpoConEncabezado, { window });
    const ciudadTxt = (this.ciudad || '').toString().trim();
    const fechaLinea = (/^\d{4}-\d{2}-\d{2}$/.test((this.fecha || '').toString().trim()))
      ? (() => { const d = new Date(this.fecha + 'T00:00:00'); return d.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' }); })()
      : '';
    const ciudadFechaLine = ciudadTxt && fechaLinea ? `${ciudadTxt}, ${fechaLinea}` : (ciudadTxt || fechaLinea);
    const anexosItems = (this.modoAjuste === 'acta' && this.anexos?.length)
      ? this.anexos.map((f, i) => {
          const desc = (this.descripcionesAnexos?.[i] || '').toString().trim();
          return desc ? `${i + 1}. ${desc}` : `${i + 1}. ${f.name}`;
        })
      : [];
    const solicitante = (this.nombre || 'Ciudadano').toString().trim();
    const docIdent = (this.n_documento || '').toString().trim();

    const contentArray: any[] = [];
    
    // Agregar logo si se cargó correctamente
    if (logoBase64) {
      contentArray.push({
        image: logoBase64,
        width: 150,
        alignment: 'center',
        margin: [0, 0, 0, 15]
      });
    }

    // Agregar número de trámite y ciudad/fecha
    contentArray.push({
      columns: [
        { width: '*', text: '' },
        {
          width: 'auto',
          stack: [
            { text: `${tipoDocumento} Nro. ${numeroTramite}`, style: 'docNumber', alignment: 'right' },
            ...(ciudadFechaLine ? [{ text: ciudadFechaLine, style: 'docDate', alignment: 'right', margin: [0, 4, 0, 0] }] : [])
          ]
        }
      ]
    });

    // Agregar contenido HTML
    contentArray.push(htmlContent);

    // Agregar anexos si existen
    if (anexosItems.length) {
      contentArray.push({ text: '\n' });
      contentArray.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 10, 0, 10] });
      contentArray.push({ text: 'Anexos', style: 'label', margin: [0, 0, 0, 6] });
      contentArray.push({ ul: anexosItems, margin: [0, 0, 0, 0] });
    }

    // Agregar firma final
    contentArray.push({ text: '\n\nAtentamente,\n\n', margin: [0, 20, 0, 0] });
    contentArray.push({ text: solicitante, bold: true });
    if (docIdent) {
      contentArray.push({ text: `C.I. ${docIdent}`, color: '#374151', fontSize: 10 });
    }

    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 60],
      content: contentArray,
      styles: {
        docNumber: { fontSize: 11, bold: true, color: '#111827' },
        docDate: { fontSize: 9.5, color: '#374151' },
        label: { fontSize: 10, bold: true, color: '#111827' },
      }
    };
  }

  cargarTipos() {
    // Fallback público: usar endpoints GET con id_empresa como query
    this.http.get(`${this.backendUrl}/tipodocumentos`, { params: new HttpParams().set('id_empresa', String(this.empresaId)) }).subscribe({
      next: (resp: any) => {
        // puede venir como lista directa o envuelta
        this.tipo_documentos = Array.isArray(resp) ? resp : (resp?.data || resp?.tipo_documentos || []);
        this.onTipoDocumentoChange();
        // Una vez seleccionado/bloqueado el tipo (Oficio), traer secuencial del documento desde backend
        this.fetchSecuencialDocumento();
      },
      error: () => { this.tipo_documentos = []; }
    });
    this.http.get(`${this.backendUrl}/listartipotramites`, { params: new HttpParams().set('id_empresa', String(this.empresaId)) }).subscribe({
      next: (resp: any) => {
        this.tipo_tramites = Array.isArray(resp) ? resp : (resp?.data || resp?.tipo_tramites || []);
      },
      error: () => { this.tipo_tramites = []; }
    });
  }

  soloNumeros(e: KeyboardEvent) {
    const allowed = /[0-9]/;
    if (!allowed.test(e.key)) e.preventDefault();
  }

  isCliente() { return this.esCliente; }

  buscarCedula() {
    const nro = (this.n_documento || '').trim();
    if (!/^\d{10}$/.test(nro)) { this.message = 'Cédula inválida'; return; }
    this.buscarPersonaONegocio(nro);
  }

  buscarRUC() {
    const nro = (this.n_documento || '').trim();
    if (!/^\d{13}$/.test(nro)) { this.message = 'RUC inválido'; return; }
    // 1) Buscar en base
    this.buscarPersonaONegocio(nro, () => {
      // 2) Si no existe, intentar SRI para prellenar
      this.http.post(`${this.api}/cliente/consultar-sri`, { ruc: nro }).subscribe({
        next: (r: any) => {
          this.nombre = r?.razon_social || r?.nombre_comercial || this.nombre;
          this.direccion = r?.direccion || this.direccion;
        },
        error: () => {}
      });
    });
  }

  private buscarPersonaONegocio(nro: string, notFoundCb?: () => void) {
    this.message = '';
    this.http.get(`${this.api}/public/cliente/buscar/${encodeURIComponent(nro)}`).subscribe({
      next: (resp: any) => {
        const c = resp?.data;
        if (c) {
          this.nombre = c?.nombre || this.nombre;
        } else if (notFoundCb) notFoundCb();
      },
      error: (err) => {
        if (err?.status === 404 && notFoundCb) notFoundCb();
      }
    });
  }

  // Consulta directa a la tabla clientes de la empresa 2
  consultarClienteEmpresa() {
    this.message = '';
    this.clienteNoEncontrado = false;
    const nro = (this.n_documento || '').trim();
    // Si está vacío, alertar con Swal y salir
    if (!nro) {
      Swal.fire({ icon: 'info', title: 'Dato requerido', text: 'Debe colocar un número de cédula o RUC.' });
      return;
    }
    if (!/^\d{10}(\d{3})?$/.test(nro)) {
      this.message = 'Ingrese cédula (10) o RUC (13) válido';
      return;
    }
    // Mostrar loading
    Swal.fire({ title: 'Trayendo datos...', text: 'Espere por favor', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const params = new HttpParams().set('id_empresa', String(this.empresaId));
    // 1) Intentar endpoint de clientes autenticado/privado si está público para esta consulta
    this.http.get(`${this.backendUrl}/cliente/buscar/${encodeURIComponent(nro)}`, { params }).subscribe({
      next: (resp: any) => {
        this.llenarDesdeCliente(resp);
        this.clienteNoEncontrado = false;
        this.permitirEdicion = true; // dejamos editable si deseas ajustar datos cargados
        try { Swal.close(); } catch {}
        // Forzar render antes de mostrar el swal de éxito
        try { this.cdr.detectChanges(); } catch {}
        Swal.fire({ title: 'Datos consultados', text: 'Se cargaron los datos del ciudadano', icon: 'success', didClose: () => { try { this.cdr.detectChanges(); } catch {} } });
      },
      error: () => {
        // 2) Fallback a ruta pública si existe
        this.http.get(`${this.backendUrl}/public/cliente/buscar/${encodeURIComponent(nro)}`, { params }).subscribe({
          next: (r2: any) => {
            this.llenarDesdeCliente(r2);
            this.clienteNoEncontrado = false;
            this.permitirEdicion = true;
            try { Swal.close(); } catch {}
            try { this.cdr.detectChanges(); } catch {}
            Swal.fire({ title: 'Datos consultados', text: 'Se cargaron los datos del ciudadano', icon: 'success', didClose: () => { try { this.cdr.detectChanges(); } catch {} } });
          },
          error: () => {
            this.message = 'Ciudadano no encontrado en la empresa 2';
            // Limpiar datos previos del cliente para evitar que queden valores antiguos
            this.limpiarRemitenteConservarDocumento();
            this.clienteNoEncontrado = true;
            this.permitirEdicion = true; // habilitar edición directa para registrar
            try { Swal.close(); } catch {}
            // Detectar cambios antes y después del cierre del modal
            try { this.cdr.detectChanges(); } catch {}
            Swal.fire({ title: 'No encontrado', text: 'Ciudadano no encontrado en la empresa 2', icon: 'warning', didClose: () => { try { this.cdr.detectChanges(); } catch {} } });
          }
        });
      }
    });
  }

  // Limpia los datos del remitente y números asociados, pero conserva el número de documento ingresado
  private limpiarRemitenteConservarDocumento() {
    // Conservar n_documento ingresado por el usuario
    const doc = this.n_documento;
    // Datos del cliente
    this.nombre = '';
    this.celular = '';
    this.email = '';
    this.direccion = '';
    this.id_cliente = null;
    // Números derivados
    this.n_interno = '';
    this.n_tramite_siguiente = '';
    this.mostrarNumeroTramite = false;
    // Mensajes auxiliares
    this.message = '';
    // Restaurar documento
    this.n_documento = doc;
    try { this.cdr.detectChanges(); } catch {}
  }

  private llenarDesdeCliente(resp: any) {
    const c = resp?.cliente || resp?.data || resp;
    if (!c) { this.message = 'Usuario no encontrado'; return; }
    // Asignaciones defensivas
    this.n_documento = c.cedula_ruc || c.ruc || c.cedula || this.n_documento;
    this.nombre = c.nombre || c.razon_social || this.nombre;
    this.celular = c.telefono || c.celular || this.celular;
    this.email = c.correo || c.email || this.email;
    this.direccion = c.direccion || c.domicilio || this.direccion;
    this.id_cliente = c.id_cliente ?? this.id_cliente;
    this.message = 'Datos del ciudadano cargados';
    // Forzar actualización de la vista por si el observable llega fuera de zona
    try { this.cdr.detectChanges(); } catch (_) {}
    this.actualizarNumeroInterno();
    // Si backend envía el ÚLTIMO número de trámite, calcular el siguiente en frontend
    const ultimoTram = resp?.ultimo_numero_tramite || resp?.data?.ultimo_numero_tramite || null;
    const ced = (this.n_documento || '').trim();
    this.mostrarNumeroTramite = true;
    if (typeof ultimoTram === 'string' && ultimoTram.length > 0) {
      const last = parseInt(ultimoTram.slice(-6), 10);
      const next = isNaN(last) ? 1 : last + 1;
      const padded = String(next).padStart(6, '0');
      this.n_tramite_siguiente = `T-${ced}-${padded}`;
      try { this.cdr.detectChanges(); } catch {}
    } else {
      this.actualizarNumeroTramiteSiguiente();
    }
  }

  // Recalcula el número interno con formato: LETRA-AÑO-CEDULA-000001
  private actualizarNumeroInterno() {
    const year = new Date().getFullYear();
    const docSel = this.tipo_documentos?.find((d: any) => String(d.id_tipodocumento) === String(this.tipo_documento));
    const letra = (docSel?.nombre || '').toString().trim().charAt(0).toUpperCase() || 'X';
    const ced = (this.n_documento || '').trim();
    if (!ced) { this.n_interno = ''; return; }
    const padded = String(this.secuencialDocNext || 1).padStart(6, '0');
    this.n_interno = `${letra}-${year}-${ced}-${padded}`;
    try { this.cdr.detectChanges(); } catch {}
  }

  onDocumentoChange() {
    this.actualizarNumeroInterno();
    if (this.mostrarNumeroTramite) this.actualizarNumeroTramiteSiguiente();
  }

  async registrarClienteManual() {
    // Validaciones mínimas
    const doc = (this.n_documento || '').trim();
    if (!/^\d{10}(\d{3})?$/.test(doc)) {
      Swal.fire('Validación', 'Ingrese cédula (10) o RUC (13) válido', 'info');
      return;
    }
    if (!this.nombre || !this.celular || !this.email || !this.direccion) {
      Swal.fire('Validación', 'Complete Nombre, Celular, Email y Dirección', 'info');
      return;
    }

    Swal.fire({ title: 'Registrando cliente...', text: 'Espere por favor', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const body: any = {
      cedula_ruc: doc,
      nombre: this.nombre.trim(),
      correo: this.email.trim(),
      telefono: this.celular.trim(),
      direccion: this.direccion.trim(),
      id_empresa: this.empresaId
    };

    this.http.post(`${this.backendUrl}/cliente`, body).subscribe({
      next: (resp: any) => {
        try { Swal.close(); } catch {}
        const c = resp?.cliente || resp?.data || resp;
        if (c?.id_cliente) this.id_cliente = c.id_cliente;
        // Ocultar botón de registrar cliente
        this.clienteNoEncontrado = false;
        // Ahora que ya hay cliente, mostrar y calcular el número de trámite siguiente
        this.mostrarNumeroTramite = true;
        this.actualizarNumeroTramiteSiguiente();
        try { this.cdr.detectChanges(); } catch {}
        Swal.fire('Éxito', 'Usuario registrado correctamente', 'success');
      },
      error: (err) => {
        try { Swal.close(); } catch {}
        // Si requiere autenticación, informar
        if (err?.status === 401 || err?.status === 403) {
          Swal.fire('Permisos requeridos', 'El registro de ciudadano requiere autenticación. Contacte al administrador.', 'warning');
        } else {
          Swal.fire('Error', 'No se pudo registrar el ciudadano', 'error');
        }
      }
    });
  }

  onTipoDocumentoChange() {
    // Si es cliente externo, bloquear a "Oficio" si existe ese tipo
    if (this.esCliente && this.tipo_documentos?.length) {
      const oficio = this.tipo_documentos.find((d: any) => `${d.nombre}`.toLowerCase().includes('oficio'));
      if (oficio) {
        this.tipo_documento = oficio.id_tipodocumento;
        this.tipoDocumentoBloqueado = true;
      }
    }
    this.actualizarNumeroInterno();
    if (this.mostrarNumeroTramite) this.actualizarNumeroTramiteSiguiente();
    // Cuando cambia el tipo de documento, refrescar secuencial del documento
    this.fetchSecuencialDocumento();
  }

  // Calcula y consulta el próximo número de trámite para este cliente
  private actualizarNumeroTramiteSiguiente() {
    const ced = (this.n_documento || '').trim();
    if (!ced) { this.n_tramite_siguiente = ''; return; }
    // No hay endpoint backend disponible; usar fallback local empezando en 000001
    this.nextSecuencial = 1;
    const padded = String(this.nextSecuencial).padStart(6, '0');
    this.n_tramite_siguiente = `T-${ced}-${padded}`;
    try { this.cdr.detectChanges(); } catch {}
  }

  // Consulta al backend el siguiente secuencial para Nº Documento Interno según tipo_documento y empresa
  private fetchSecuencialDocumento() {
    const idTipo = Number(this.tipo_documento);
    if (!idTipo || !this.empresaId) return;
    // Consultar sólo si el tipo de documento comienza con 'O' (Oficio)
    const docSel = this.tipo_documentos?.find((d: any) => String(d.id_tipodocumento) === String(this.tipo_documento));
    const letra = (docSel?.nombre || '').toString().trim().charAt(0).toUpperCase();
    if (letra !== 'O') {
      return;
    }
    const body: any = { id_tipodocumento: idTipo, id_empresa: Number(this.empresaId) };
    this.http.post(`${this.backendUrl}/tipodocumento/get-secuencial`, body).subscribe({
      next: (r: any) => {
        // Preferir 'next' directo si viene; si no, tomar 'secuencial' como último y sumar +1
        const nextFromApi = Number(r?.next ?? r?.data?.next ?? NaN);
        if (!isNaN(nextFromApi) && nextFromApi > 0) {
          this.secuencialDocNext = nextFromApi;
        } else {
          const last = Number(r?.secuencial ?? r?.data?.secuencial ?? NaN);
          const computedNext = isNaN(last) || last < 0 ? 1 : (last + 1);
          this.secuencialDocNext = computedNext;
        }
        this.actualizarNumeroInterno();
      },
      error: () => {
        this.secuencialDocNext = 1;
        this.actualizarNumeroInterno();
      }
    });
  }

  async onFileSelectedElectronico(ev: any) {
    const files: FileList = ev?.target?.files;
    const selected: File | undefined = files && files.length ? files[0] : undefined;
    if (!selected) { this.archivoElectronico = null; try { this.cdr.detectChanges(); } catch {} return; }
    const name = (selected.name || '').trim().toLowerCase();
    const type = (selected.type || '').trim().toLowerCase();
    const isPdf = type === 'application/pdf' || name.endsWith('.pdf');
    if (!isPdf) {
      Swal.fire({ icon: 'warning', title: 'Documento no válido', text: 'Debe subir un documento electrónico (PDF firmado).' });
      this.archivoElectronico = null;
      try { ev.target.value = '' } catch {}
      try { this.cdr.detectChanges(); } catch {}
      return;
    }
    const firmado = await this.validarPdfFirmado(selected);
    if (!firmado) {
      Swal.fire({ icon: 'warning', title: 'Documento no firmado', text: 'Debe subir un documento electrónico firmado (PDF con firma digital válida).' });
      this.archivoElectronico = null;
      try { ev.target.value = '' } catch {}
      try { this.cdr.detectChanges(); } catch {}
      return;
    }
    this.archivoElectronico = selected;
    // No se requieren folios para PDF firmado
    this.folios = 0;
    this.foliosCalculando = false;
    this.foliosBloqueado = true;
    try { this.cdr.detectChanges(); } catch {}
  }

  onFileSelectedFisico(ev: any) {
    const files: FileList = ev?.target?.files;
    const selected: File | undefined = files && files.length ? files[0] : undefined;
    if (!selected) { this.archivoFisico = null; try { this.cdr.detectChanges(); } catch {} return; }
    const name = (selected.name || '').trim().toLowerCase();
    const type = (selected.type || '').trim().toLowerCase();
    const isPdf = type === 'application/pdf' || name.endsWith('.pdf');
    if (!isPdf) {
      Swal.fire({ icon: 'warning', title: 'Documento no válido', text: 'Debe subir un PDF escaneado.' });
      this.archivoFisico = null;
      try { ev.target.value = '' } catch {}
      try { this.cdr.detectChanges(); } catch {}
      return;
    }
    this.archivoFisico = selected;
    // Para físico, podrías estimar folios por páginas si se quiere; aquí lo dejamos manual
    try { this.cdr.detectChanges(); } catch {}
  }

  // Heurística simple para detectar firma digital en un PDF
  // Busca patrones típicos: /Type /Sig y /ByteRange
  private validarPdfFirmado(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onerror = () => resolve(false);
        reader.onload = () => {
          try {
            const buf = reader.result as ArrayBuffer;
            // Decodificar como latin1 para preservar bytes sin romperse
            const content = new TextDecoder('latin1').decode(new Uint8Array(buf));
            const hasSig = /\/Type\s*\/Sig\b/.test(content);
            const hasByteRange = /\/ByteRange\s*\[/.test(content);
            // Algunas implementaciones usan /AcroForm con /SigFlags
            const hasAcroSig = /\/AcroForm\b/.test(content) && /\/SigFlags\s+\d+/.test(content);
            resolve((hasSig && hasByteRange) || hasAcroSig);
          } catch {
            resolve(false);
          }
        };
        // Leer todo el archivo; si se quiere optimizar, leer primeros MB suele bastar
        reader.readAsArrayBuffer(file);
      } catch {
        resolve(false);
      }
    });
  }

  private abrirArchivo(f: File) {
    try {
      const url = URL.createObjectURL(f);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      // Mejorar compatibilidad con bloqueadores: si no se abrió, avisar
      if (!win) {
        Swal.fire({ icon: 'info', title: 'Abrir documento', text: 'Permita ventanas emergentes para ver el PDF.' });
      } else {
        // Desvincular el opener por seguridad y revocar la URL luego de abrir
        try { (win as any).opener = null; } catch {}
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo abrir', text: 'Ocurrió un problema al abrir el documento.' });
    }
  }

  verElectronico() { if (this.archivoElectronico) this.abrirArchivo(this.archivoElectronico); }
  verFisico() { if (this.archivoFisico) this.abrirArchivo(this.archivoFisico); }

  // Manejo de anexos (card adicional)
  onAnexosSelected(ev: any) {
    const files: FileList = ev?.target?.files;
    this.anexos = Array.from(files || []);
    // Inicializar descripciones por cada anexo seleccionado
    this.descripcionesAnexos = this.anexos.map(() => '');
    try { this.cdr.detectChanges(); } catch {}
  }

  removeAnexo(index: number) {
    if (index < 0 || index >= this.anexos.length) return;
    this.anexos.splice(index, 1);
    this.descripcionesAnexos.splice(index, 1);
    try { this.cdr.detectChanges(); } catch {}
  }

  verAnexo(index: number) {
    if (index < 0 || index >= this.anexos.length) return;
    const f = this.anexos[index];
    try {
      const url = URL.createObjectURL(f);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        Swal.fire({ icon: 'info', title: 'Abrir anexo', text: 'Permita ventanas emergentes para ver el documento.' });
      } else {
        try { (win as any).opener = null; } catch {}
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo abrir', text: 'Ocurrió un problema al abrir el anexo.' });
    }
  }

  clearElectronico(input?: HTMLInputElement) { this.archivoElectronico = null; if (input) try { input.value = '' } catch {}; try { this.cdr.detectChanges(); } catch {} }
  clearFisico(input?: HTMLInputElement) { this.archivoFisico = null; if (input) try { input.value = '' } catch {}; try { this.cdr.detectChanges(); } catch {} }

  registrarTramite() {
      // Validaciones con Swal, una por caso
      // Validar ciudad y fecha (nuevos campos obligatorios)
      if (!this.ciudad || !this.ciudad.trim()) {
        Swal.fire({ icon: 'warning', title: 'Validación', text: 'Ingrese la Ciudad.' });
        return;
      }
      if (!this.fecha) {
        Swal.fire({ icon: 'warning', title: 'Validación', text: 'Seleccione la Fecha.' });
        return;
      }
      if (!this.asunto || !this.asunto.trim()) {
        Swal.fire({ icon: 'warning', title: 'Validación', text: 'Ingrese el Asunto del trámite.' });
        return;
      }
      // Requiere archivo solo cuando el modo es 'electronico'
      if (this.modoAjuste === 'electronico') {
        if (!this.archivoElectronico) {
          Swal.fire({ icon: 'warning', title: 'Validación', text: 'Debe subir un documento electrónico (PDF firmado).' });
          return;
        }
        const f = this.archivoElectronico;
        const isPdf = (f.type === 'application/pdf') || (f.name || '').toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          Swal.fire({ icon: 'warning', title: 'Validación', text: 'Debe subir un documento electrónico (PDF firmado).' });
          return;
        }
      }
      if (!this.declaracion) {
        Swal.fire({ icon: 'info', title: 'Declaración requerida', text: 'Debe aceptar la declaración para continuar.' });
        return;
      }
      // Validación general restante
      if (!this.n_documento || !this.nombre || !this.celular || !this.email || !this.direccion) {
        Swal.fire({ icon: 'warning', title: 'Validación', text: 'Complete los datos del remitente.' });
        return;
      }

       const fd = new FormData();
       fd.append('n_documento', this.n_documento.trim());
       fd.append('nombre', this.nombre.trim());
       fd.append('celular', this.celular.trim());
       fd.append('email', this.email.trim());
       fd.append('direccion', this.direccion.trim());
       // Nuevos campos obligatorios
       fd.append('ciudad', this.ciudad.trim());
       fd.append('fecha', this.fecha);
       fd.append('asunto', this.asunto.trim());
       fd.append('folios', String(this.folios || 0));
       fd.append('id_empresa', String(this.empresaId));
       if (this.n_interno) fd.append('num_documento_interno', this.n_interno);
       if (this.n_tramite_siguiente) fd.append('numero_tramite', this.n_tramite_siguiente);

      const doPost = () => {
        // Adjuntar anexos y descripciones si existen
        if (this.anexos && this.anexos.length) {
          this.anexos.forEach((f) => fd.append('anexos[]', f, f.name));
          const descs = this.descripcionesAnexos || [];
          // Alinear cantidad de descripciones con anexos
          for (let i = 0; i < this.anexos.length; i++) {
            fd.append('anexos_descripcion[]', (descs[i] || '').toString());
          }
        }
        this.loading = true;
        
        // Mostrar mensaje de carga
        Swal.fire({
          title: 'Espere un momento',
          html: 'Estamos registrando su trámite...',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        this.http.post(`${this.backendUrl}/RegistrarTramiteCliente`, fd).subscribe({
          next: (r: any) => { 
            this.loading = false;
            Swal.close();
            const numeroTramiteMostrado = r?.numero_tramite || this.n_tramite_siguiente || r?.documento;
            const fechaIngreso = new Date().toLocaleString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
            const ciudadano = (this.nombre || 'Ciudadano').toString();
            const docIdent = (this.n_documento || '').toString();
            const mensajeHtml = `
              <div style="text-align:center; margin-top:6px;">
                <div style="font-size:22px; font-weight:700; color:#0d6efd; margin-bottom:10px;">${this.escapeHtml(numeroTramiteMostrado)}</div>
              </div>
              <div style="text-align:left; line-height:1.5;">
                <div><strong>Ciudadano:</strong> ${this.escapeHtml(ciudadano)}</div>
                <div><strong>Cédula/RUC:</strong> ${this.escapeHtml(docIdent)}</div>
                <div><strong>Fecha de ingreso:</strong> ${this.escapeHtml(fechaIngreso)}</div>
              </div>`;
            Swal.fire({
              icon: 'success',
              title: 'Registro Exitoso',
              html: mensajeHtml,
              confirmButtonText: 'Aceptar'
            });
            // Preparar siguiente correlativo de documento interno localmente (backend puede tardar en reflejar)
            const prevTipoDoc = this.tipo_documento;
            const prevNext = this.secuencialDocNext || 1;
            this.resetFormulario();
            // Mantener el tipo de documento seleccionado si existía y refrescar secuencial
            if (prevTipoDoc) {
              this.tipo_documento = prevTipoDoc;
              try { this.cdr.detectChanges(); } catch {}
              // En lugar de consultar, incrementar localmente
              this.secuencialDocNext = (prevNext || 1) + 1;
              // n_interno se actualizará al ingresar documento; si ya hay documento, recalcularía aquí
            }
          },
          error: (err) => { 
            this.loading = false;
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo registrar el trámite: ' + (err.error?.error || 'Error desconocido')
            });
          }
        });
      };

      if (this.modoAjuste === 'electronico') {
        if (this.archivoElectronico) fd.append('archivos[]', this.archivoElectronico, this.archivoElectronico.name);
        doPost();
      } else if (this.modoAjuste === 'fisico') {
        if (!this.archivoFisico) {
          Swal.fire({ icon: 'warning', title: 'Validación', text: 'Debe subir el PDF escaneado (físico firmado).' });
          return;
        }
        fd.append('archivos[]', this.archivoFisico, this.archivoFisico.name);
        doPost();
       } else {
         // Crear Acta en PDF y adjuntarla con nombre: NUMERO_TRAMITE-Acta.pdf
         try {
           (pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;
           this.generarDocDefinitionActaParaEnvio().then((docDefinition: any) => {
             const pMake: any = pdfMake;
             const pdfDoc = pMake.createPdf(docDefinition);
             pdfDoc.getBlob((blob: Blob) => {
               const baseName = (this.n_tramite_siguiente || this.n_interno || 'TRAMITE').toString();
               const fileName = `${baseName}-Acta.pdf`;
               fd.append('archivos[]', blob, fileName);
               doPost();
             });
           }).catch(() => {
             Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el Acta en PDF para enviar.' });
           });
         } catch (err) {
           Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el Acta en PDF para enviar.' });
         }
       }
  }

  // Función auxiliar para limpiar
  resetFormulario() {
       // Datos remitente
       this.n_documento = '';
       this.nombre = '';
       this.celular = '';
       this.email = '';
       this.direccion = '';

       // Documento / Trámite
       this.tipo_tramite = '' as any;
       // Mantenemos tipo_documento bloqueado a Oficio si ya está; no lo cambiamos aquí
       this.asunto = '';
       this.folios = 0;
       this.foliosBloqueado = true;
       this.foliosCalculando = false;
       this.archivoElectronico = null;
       this.archivoFisico = null;
       
       // Limpiar inputs de archivo
       if (this.inpElec?.nativeElement) {
         this.inpElec.nativeElement.value = '';
       }
       if (this.inpFis?.nativeElement) {
         this.inpFis.nativeElement.value = '';
       }
       
       // Anexos y descripciones
       this.anexos = [];
       this.descripcionesAnexos = [];

       // Declaración y mensajes
       this.declaracion = false;
       this.message = '';

       // Cliente y flags
       this.id_cliente = null;
       this.permitirEdicion = false;
       this.clienteNoEncontrado = false;

       // Números
       this.n_interno = '';
       this.n_tramite_siguiente = '';
       this.mostrarNumeroTramite = false;

       // UI y vistas
       this.modoAjuste = 'electronico';
       this.showActaModal = false;
       this.actaPdfUrl = null;
       // Editor: volver solo al cuerpo por defecto, el encabezado (Señores, Presente, Ciudad/Fecha, Asunto) se agrega al generar PDF
       this.contenidoCuerpo = `
         <p>De mi consideración:</p>
         <p>&nbsp;</p>
         <p>&nbsp;</p>
         <p>Con sentimientos de distinguida consideración.</p>
       `;

       try { this.cdr.detectChanges(); } catch {}
   }
}
