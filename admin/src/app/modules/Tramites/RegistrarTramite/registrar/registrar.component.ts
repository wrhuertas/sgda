import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as htmlToPdfmake from 'html-to-pdfmake';
import { URL_SERVICIOS } from 'src/app/config/config';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { RegistrarService } from '../service/registrar.service';

@Component({
  selector: 'app-registrar',
  templateUrl: './registrar.component.html',
  styleUrls: ['./registrar.component.scss']
})
export class RegistrarComponent implements OnInit {
  api = environment.apiUrl ?? '/api';
  private readonly backendUrl = URL_SERVICIOS;
  
  // Datos del usuario logueado
  id_empresa: number | null = null;
  id_usuario: number | null = null;

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
  
  // Archivos por modo
  archivoElectronico: File | null = null;
  archivoFisico: File | null = null;
  folios = 0;
  foliosBloqueado = true;
  foliosCalculando = false;
  declaracion = false;
  tipoDocumentoBloqueado = false;
  
  // Resultado de búsqueda de cliente
  private id_cliente: number | null = null;
  clienteNoEncontrado = false;
  permitirEdicion = false;
  private secuencialBase = '000001';
  private nextSecuencial = 1;
  n_tramite_siguiente = '';
  mostrarNumeroTramite = false;
  private secuencialDocNext = 1;

  tipo_tramites: any[] = [];
  tipo_documentos: any[] = [];

  esCliente = true;

  loading = false;
  message = '';
  modoAjuste: 'acta' | 'electronico' | 'fisico' = 'fisico';
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
  categoria: string = 'Normal';
  
  // Datos de la empresa
  empresaData: any = null;

usuario_id: number | null = null;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    public toast: ToastrService,
    public authService: AuthService,
    private registrarService: RegistrarService
  ) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.id_empresa = user?.id_empresa ?? null;
    this.id_usuario = user?.id ?? null;
    
   // console.log('Componente Registrar - Usuario:', { id_empresa: this.id_empresa, id_usuario: this.id_usuario });
    
    this.cargarTipos();
    this.cargarDatosEmpresa();
  }

  // Resetea el file input
  resetFilePicker(ev: any) {
    try { ev.target.value = '' } catch {}
  }

  onEditorReady(_: any) {}

  async setModoAjuste(next: 'acta' | 'electronico' | 'fisico') {
    if (next === this.modoAjuste) return;
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
    // Obtener datos de la empresa del usuario logueado
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const idEmpresa = user?.id_empresa;

    if (!idEmpresa) {
      Swal.fire('Error', 'No se identificó la empresa del usuario', 'error');
      return;
    }

    // Cargar datos de la empresa
    this.http.get(`${this.backendUrl}/empresaid/${idEmpresa}`).subscribe({
      next: (empresa: any) => {
        this.empresaData = empresa;
        // Ahora generar el PDF con los datos de la empresa
        this.generarPDFActa();
      },
      error: (err) => {
        console.error('Error al cargar empresa:', err);
        // Si no se puede cargar, generar sin datos de empresa
        this.generarPDFActa();
      }
    });
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

  async generarPDFActa() {
    try {
      (pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;

      let logoBase64 = '';
      let cabecerapBase64 = '';
      
      try {
        // Si tenemos datos de la empresa, usar su logo
        if (this.empresaData?.imagen_empresa) {
          logoBase64 = await this.cargarImagenBase64(this.empresaData.imagen_empresa);
        } else {
          // Si no, usar el logo quemado como fallback
          logoBase64 = await this.cargarImagenBase64('assets/logo_cotopaxi.png');
        }
      } catch {
        console.warn('No se pudo cargar el logo');
      }

      try {
        // Cargar imagen cabecera si existe
        if (this.empresaData?.imagen_cabecera) {
         // console.log('Cargando cabecera:', this.empresaData.imagen_cabecera);
          cabecerapBase64 = await this.cargarImagenBase64(this.empresaData.imagen_cabecera);
       //   console.log('Cabecera cargada exitosamente:', cabecerapBase64?.substring(0, 50));
        }
      } catch (err) {
        console.warn('No se pudo cargar la imagen cabecera:', err);
      }

      const tipoDocumento = 'OFICIO';
      const numeroTramite = String(this.n_interno || this.n_tramite_siguiente || 'S/N');
      const fechaInput = (this.fecha || '').toString().trim();
      let fecha = '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaInput)) {
        const d = new Date(fechaInput + 'T00:00:00');
        fecha = d.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
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
      
      // Agregar imagen cabecera arriba del todo
      if (cabecerapBase64) {
        contentArray.push({
          image: cabecerapBase64,
          width: '100%',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        });
      }
      
      if (logoBase64) {
        contentArray.push({
          image: logoBase64,
          width: 120,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        });
      }

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

      contentArray.push(htmlContent);

      if (anexosItems.length) {
        contentArray.push({ text: '\n' });
        contentArray.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 10, 0, 10] });
        contentArray.push({ text: 'Anexos', style: 'label', margin: [0, 0, 0, 6] });
        contentArray.push({ ul: anexosItems, margin: [0, 0, 0, 0] });
      }

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

  private async generarDocDefinitionActaParaEnvio() {
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
    
    if (logoBase64) {
      contentArray.push({
        image: logoBase64,
        width: 150,
        alignment: 'center',
        margin: [0, 0, 0, 15]
      });
    }

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

    contentArray.push(htmlContent);

    if (anexosItems.length) {
      contentArray.push({ text: '\n' });
      contentArray.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 10, 0, 10] });
      contentArray.push({ text: 'Anexos', style: 'label', margin: [0, 0, 0, 6] });
      contentArray.push({ ul: anexosItems, margin: [0, 0, 0, 0] });
    }

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
    this.http.get(`${this.backendUrl}/tipodocumentos`, { params: new HttpParams().set('id_empresa', String(this.id_empresa)) }).subscribe({
      next: (resp: any) => {
        this.tipo_documentos = Array.isArray(resp) ? resp : (resp?.data || resp?.tipo_documentos || []);
        this.onTipoDocumentoChange();
        this.fetchSecuencialDocumento();
      },
      error: () => { this.tipo_documentos = []; }
    });
    this.http.get(`${this.backendUrl}/listartipotramites`, { params: new HttpParams().set('id_empresa', String(this.id_empresa)) }).subscribe({
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
    this.buscarPersonaONegocio(nro, () => {
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

  consultarClienteEmpresa() {
    this.message = '';
    this.clienteNoEncontrado = false;
    const nro = (this.n_documento || '').trim();
    if (!nro) {
      Swal.fire({ icon: 'info', title: 'Dato requerido', text: 'Debe colocar un número de cédula o RUC.' });
      return;
    }
    if (!/^\d{10}(\d{3})?$/.test(nro)) {
      this.message = 'Ingrese cédula (10) o RUC (13) válido';
      return;
    }
    Swal.fire({ title: 'Trayendo datos...', text: 'Espere por favor', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const params = new HttpParams().set('id_empresa', String(this.id_empresa));
    this.http.get(`${this.backendUrl}/cliente/buscar/${encodeURIComponent(nro)}`, { params }).subscribe({
      next: (resp: any) => {
        this.llenarDesdeCliente(resp);
        this.clienteNoEncontrado = false;
        this.permitirEdicion = true;
        try { Swal.close(); } catch {}
        try { this.cdr.detectChanges(); } catch {}
        Swal.fire({ title: 'Datos consultados', text: 'Se cargaron los datos del ciudadano', icon: 'success', didClose: () => { try { this.cdr.detectChanges(); } catch {} } });
      },
      error: () => {
        this.http.get(`${this.backendUrl}/clienterecepcion/buscar/${encodeURIComponent(nro)}`, { params }).subscribe({
          next: (r2: any) => {
            this.llenarDesdeCliente(r2);
            this.clienteNoEncontrado = false;
            this.permitirEdicion = true;
            try { Swal.close(); } catch {}
            try { this.cdr.detectChanges(); } catch {}
            Swal.fire({ title: 'Datos consultados', text: 'Se cargaron los datos del ciudadano', icon: 'success', didClose: () => { try { this.cdr.detectChanges(); } catch {} } });
          },
          error: () => {
            this.message = 'Ciudadano no encontrado en la empresa';
            this.limpiarRemitenteConservarDocumento();
            this.clienteNoEncontrado = true;
            this.permitirEdicion = true;
            try { Swal.close(); } catch {}
            try { this.cdr.detectChanges(); } catch {}
            Swal.fire({ title: 'No encontrado', text: 'Ciudadano no encontrado en la empresa', icon: 'warning', didClose: () => { try { this.cdr.detectChanges(); } catch {} } });
          }
        });
      }
    });
  }

  private limpiarRemitenteConservarDocumento() {
    const doc = this.n_documento;
    this.nombre = '';
    this.celular = '';
    this.email = '';
    this.direccion = '';
    this.id_cliente = null;
    this.n_interno = '';
    this.n_tramite_siguiente = '';
    this.mostrarNumeroTramite = false;
    this.message = '';
    this.n_documento = doc;
    try { this.cdr.detectChanges(); } catch {}
  }

  private llenarDesdeCliente(resp: any) {
    const c = resp?.cliente || resp?.data || resp;
    if (!c) { this.message = 'Usuario no encontrado'; return; }

    // Mapeo de datos
    this.n_documento = c.cedula_ruc || c.ruc || c.cedula || this.n_documento;
    this.nombre = c.nombre || c.razon_social || this.nombre;
    this.celular = c.telefono || c.celular || this.celular;
    this.email = c.correo || c.email || this.email;
    this.direccion = c.direccion || c.domicilio || this.direccion;
    this.id_cliente = c.id_cliente ?? this.id_cliente;
    
    this.message = 'Datos del ciudadano cargados';
    this.mostrarNumeroTramite = true;

    // --- Lógica del número de trámite ---
    // Usamos 'c' que es el objeto donde vienen los datos
    const cantidadActual = c.tramites_count || 0; 
    const proximoNumero = cantidadActual + 1;
    
    // Formateo a 6 dígitos
    const secuencial = proximoNumero.toString().padStart(6, '0');
    
    // Generación del código (usando la variable local 'c' para la cédula)
    const numeroTramiteGenerado = `T-${this.n_documento}-${secuencial}`;
    
    // Asignación a tu variable de clase (asumiendo que así la llamas)
    this.n_tramite_siguiente = numeroTramiteGenerado; 

    // Refrescar vista
    try { this.cdr.detectChanges(); } catch (_) {}
    
    this.actualizarNumeroInterno();
}

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
      id_empresa: this.id_empresa,
      // Necesario para registrar en auditoría quién creó el cliente
      id_usuario: this.id_usuario
    };

    this.http.post(`${this.backendUrl}/cliente`, body).subscribe({
      next: (resp: any) => {
        try { Swal.close(); } catch {}
        const c = resp?.cliente || resp?.data || resp;
        if (c?.id_cliente) this.id_cliente = c.id_cliente;
        this.clienteNoEncontrado = false;
        this.mostrarNumeroTramite = true;
        this.actualizarNumeroTramiteSiguiente();
        try { this.cdr.detectChanges(); } catch {}
        Swal.fire('Éxito', 'Usuario registrado correctamente', 'success');
      },
      error: (err) => {
        try { Swal.close(); } catch {}
        if (err?.status === 401 || err?.status === 403) {
          Swal.fire('Permisos requeridos', 'El registro de ciudadano requiere autenticación. Contacte al administrador.', 'warning');
        } else {
          Swal.fire('Error', 'No se pudo registrar el ciudadano', 'error');
        }
      }
    });
  }

  onTipoDocumentoChange() {
    if (this.esCliente && this.tipo_documentos?.length) {
      const oficio = this.tipo_documentos.find((d: any) => `${d.nombre}`.toLowerCase().includes('oficio'));
      if (oficio) {
        this.tipo_documento = oficio.id_tipodocumento;
        this.tipoDocumentoBloqueado = true;
      }
    }
    this.actualizarNumeroInterno();
    if (this.mostrarNumeroTramite) this.actualizarNumeroTramiteSiguiente();
    this.fetchSecuencialDocumento();
  }

  private actualizarNumeroTramiteSiguiente() {
    const ced = (this.n_documento || '').trim();
    if (!ced) { this.n_tramite_siguiente = ''; return; }
    this.nextSecuencial = 1;
    const padded = String(this.nextSecuencial).padStart(6, '0');
    this.n_tramite_siguiente = `T-${ced}-${padded}`;
    try { this.cdr.detectChanges(); } catch {}
  }

  private fetchSecuencialDocumento() {
      const idTipo = Number(this.tipo_documento);
      if (!idTipo || !this.id_empresa) return;
      
      const docSel = this.tipo_documentos?.find((d: any) => String(d.id_tipodocumento) === String(this.tipo_documento));
      const letra = (docSel?.nombre || '').toString().trim().charAt(0).toUpperCase();
      
      if (letra !== 'O') {
        return;
      }

      this.registrarService.getSecuencial(idTipo, this.id_empresa).subscribe({
        next: (r: any) => {
          // --- LOG PARA VER LA ESTRUCTURA DEL OBJETO ---
          console.log('LOG [Respuesta getSecuencial]:', r); 
          
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
        error: (err) => {
          console.error('LOG [Error al obtener secuencial]:', err);
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
    try { this.cdr.detectChanges(); } catch {}
  }

  private validarPdfFirmado(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onerror = () => resolve(false);
        reader.onload = () => {
          try {
            const buf = reader.result as ArrayBuffer;
            const content = new TextDecoder('latin1').decode(new Uint8Array(buf));
            const hasSig = /\/Type\s*\/Sig\b/.test(content);
            const hasByteRange = /\/ByteRange\s*\[/.test(content);
            const hasAcroSig = /\/AcroForm\b/.test(content) && /\/SigFlags\s+\d+/.test(content);
            resolve((hasSig && hasByteRange) || hasAcroSig);
          } catch {
            resolve(false);
          }
        };
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
      if (!win) {
        Swal.fire({ icon: 'info', title: 'Abrir documento', text: 'Permita ventanas emergentes para ver el PDF.' });
      } else {
        try { (win as any).opener = null; } catch {}
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo abrir', text: 'Ocurrió un problema al abrir el documento.' });
    }
  }

  verElectronico() { if (this.archivoElectronico) this.abrirArchivo(this.archivoElectronico); }
  verFisico() { if (this.archivoFisico) this.abrirArchivo(this.archivoFisico); }

  onAnexosSelected(ev: any) {
    const files: FileList = ev?.target?.files;
    this.anexos = Array.from(files || []);
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


  cargarDatosEmpresa() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const idEmpresa = this.id_empresa ?? user?.id_empresa ?? null;

  if (!idEmpresa) {
    console.warn("No se encontró id_empresa");
    return;
  }

  console.log("ID EMPRESA ENVIADO:", idEmpresa);

    this.registrarService.cargarempresaid(Number(idEmpresa)).subscribe({
    next: (resp: any) => {
      console.log("Respuesta recibida del servidor:", resp);
      // Guardar los datos de la empresa para uso en la plantilla
      this.empresaData = resp || null;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error("Error en la petición de Empresa:", err);
    }
  });
}



















  registrarTramite() {
    // Validaciones
  
    if (!this.tipo_documento) {
      Swal.fire({ icon: 'warning', title: 'Validación', text: 'Seleccione el Tipo de Documento.' });
      return;
    }
    if (!this.tipo_tramite) {
      Swal.fire({ icon: 'warning', title: 'Validación', text: 'Seleccione el Tipo de Trámite.' });
      return;
    }
    if (!this.asunto || !this.asunto.trim()) {
      Swal.fire({ icon: 'warning', title: 'Validación', text: 'Ingrese el Asunto del trámite.' });
      return;
    }
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
    fd.append('ciudad', this.ciudad.trim());
    fd.append('fecha', this.fecha);
    fd.append('asunto', this.asunto.trim());
    fd.append('categoria', this.categoria);
    fd.append('folios', String(this.folios || 0));
    fd.append('id_empresa', String(this.id_empresa));
    fd.append('id_usuario', String(this.id_usuario));
    if (this.n_interno) fd.append('num_documento_interno', this.n_interno);
    if (this.n_tramite_siguiente) fd.append('numero_tramite', this.n_tramite_siguiente);
    if (this.tipo_documento) {
      fd.append('id_tipo_documento', String(this.tipo_documento));
    }
    if (this.tipo_tramite) {
      fd.append('id_tipo_tramite', String(this.tipo_tramite));
    }

    const doPost = () => {
      if (this.anexos && this.anexos.length) {
        this.anexos.forEach((f) => fd.append('anexos[]', f, f.name));
        const descs = this.descripcionesAnexos || [];
        for (let i = 0; i < this.anexos.length; i++) {
          fd.append('anexos_descripcion[]', (descs[i] || '').toString());
        }
      }
      this.loading = true;
      this.http.post(`${this.backendUrl}/RegistrarTramiteCliente`, fd).subscribe({
        next: (r: any) => { 
          this.loading = false;
          const numeroTramiteMostrado = r?.numero_tramite || this.n_tramite_siguiente || r?.documento;
          const fechaIngreso = new Date().toLocaleString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
          const ciudadano = (this.nombre || 'Ciudadano').toString();
          const docIdent = (this.n_documento || '').toString();
         // Asegúrate de tener el email disponible (ya lo mapeaste en this.email)
          const mensajeHtml = `
            <div style="text-align:center; margin-top:6px;">
              <div style="font-size:22px; font-weight:700; color:#0d6efd; margin-bottom:10px;">${this.escapeHtml(this.n_tramite_siguiente)}</div>
            </div>
            <div style="text-align:left; line-height:1.6; border-top: 1px solid #eee; padding-top: 10px;">
              <div><strong>Ciudadano:</strong> ${this.escapeHtml(this.nombre)}</div>
              <div><strong>Cédula/RUC:</strong> ${this.escapeHtml(this.n_documento)}</div>
              <div style="margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                <i class="fas fa-envelope" style="color: #6c757d; margin-right: 5px;"></i>
                Se ha enviado una notificación al correo: <br>
                <strong style="color: #212529;">${this.escapeHtml(this.email || 'No registrado')}</strong>
              </div>
            </div>`;

          Swal.fire({
            icon: 'success',
            title: 'Registro Exitoso',
            html: mensajeHtml,
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#0d6efd'
          });
          const prevTipoDoc = this.tipo_documento;
          const prevNext = this.secuencialDocNext || 1;
          this.resetFormulario();
          if (prevTipoDoc) {
            this.tipo_documento = prevTipoDoc;
            try { this.cdr.detectChanges(); } catch {}
            this.secuencialDocNext = (prevNext || 1) + 1;
          }
        },
        error: (err) => { 
          this.loading = false; 
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

  // Devuelve la URL del logo de la empresa o un fallback local si no existe
  getEmpresaLogoUrl(): string {
    const fallback = 'assets/logo_cotopaxi.png';
    const e = this.empresaData;
    if (!e) return fallback;
    // Preferir imagen_empresa (logo), si existe y es URL absoluta, usarla
    const img = String(e.imagen_empresa || e.imagen_cabecera || '').trim();
    if (!img) return fallback;
    if (/^https?:\/\//i.test(img)) return img;
    // Si viene una ruta relativa (p.ej. 'empresas/cabecera/xxx.png'), resolverla contra el backend
    const base = String(this.backendUrl || '').replace(/\/+$/, '');
    // Algunas rutas ya pueden incluir 'storage/', otras no
    const candidate = img.replace(/^\/+/, '');
    return `${base}/storage/${candidate}`;
  }

  onLogoError(ev: any) {
    try { ev.target.src = 'assets/logo_cotopaxi.png'; } catch {}
  }

  resetFormulario() {
    this.n_documento = '';
    this.nombre = '';
    this.celular = '';
    this.email = '';
    this.direccion = '';
    this.tipo_tramite = '' as any;
    this.asunto = '';
    this.categoria = 'Normal';
    this.folios = 0;
    this.foliosBloqueado = true;
    this.foliosCalculando = false;
    this.archivoElectronico = null;
    this.archivoFisico = null;
    this.anexos = [];
    this.descripcionesAnexos = [];
    this.declaracion = false;
    this.message = '';
    this.id_cliente = null;
    this.permitirEdicion = false;
    this.clienteNoEncontrado = false;
    this.n_interno = '';
    this.n_tramite_siguiente = '';
    this.mostrarNumeroTramite = false;
    this.modoAjuste = 'electronico';
    this.showActaModal = false;
    this.actaPdfUrl = null;
    this.contenidoCuerpo = `
      <p>De mi consideración:</p>
      <p>&nbsp;</p>
      <p>&nbsp;</p>
      <p>Con sentimientos de distinguida consideración.</p>
    `;
    try { this.cdr.detectChanges(); } catch {}
  }
}
