import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { URL_SERVICIOS } from 'src/app/config/config';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { IndexacionSerieService } from '../service/indexacion-serie.service';
import * as pdfjsLib from 'pdfjs-dist';
import { pdfjsWorker } from 'pdfjs-dist/build/pdf.worker.entry';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

@Component({
  selector: 'app-ver-documento',
  templateUrl: './ver-documento.component.html',
  styleUrls: ['./ver-documento.component.scss']
})
export class VerDocumentoComponent implements OnInit {
  // IDs requeridos para obtener la imagen por página desde el backend
  @Input() idDocumento!: number;
  @Input() idEmpresa!: number;
  @Input() idSerieSubserie!: number | null;
  // Modo alternativo: ver un PDF por URL o por base64 (ej. anexos). Renderiza con pdf.js.
  @Input() urlPdf?: string | null;
  @Input() pdfBase64?: string | null;
  // Modo anexo: el backend convierte el archivo (TIF, JPG, PNG...) a PNG con Imagick,
  // página por página. Reusa todo el visor de imágenes (zoom, pan, paginación).
  @Input() idAnexo?: any;
  @Input() nombreArchivo?: string;
  modoUrl = false;
  modoAnexo = false;
  private pdfDocUrl: any = null;
  // Ruta y PDF del documento en el servidor, para armar miniaturas sin pedir
  // página por página al backend
  private rutaDocumento: string | null = null;
  private pdfDocMiniaturas: any = null;

  // Estado del visor
  paginaMostrada: string | null = null; // base64 devuelta por el backend
  paginaActual = 0; // 0-based
  // Páginas editadas (limpieza) por índice 0-based => base64. Se persiste entre navegación.
  paginasEditadas: { [index: number]: string } = {};
  totalPaginas = 0;
  // Input para salto de página (1-based en UI)
  jumpPage: number | null = null;

  private _paginasImpresas: number[] = [];
  // Marca si en algún momento se lanzó la impresión del documento completo
  private _imprimioCompleto = false;

  // Zoom con el que abre el visor (1 = 100%). Lo puede fijar quien lo abre.
  @Input() zoomInicial?: number;

  // El visor de auditoría lo abre en false: allí no se puede imprimir
  @Input() permitirImprimir = true;

  // Modo consulta (búsqueda, auditoría): solo se ve y se navega el documento,
  // sin limpiar, separadores, insertar hojas ni guardar versiones
  @Input() soloLectura = false;

  // Zoom del visor
  zoomScale = 1; // 1 = 100%
  private readonly zoomStep = 0.2;
  private readonly minZoom = 0.5;
  private readonly maxZoom = 3;

  // Dimensiones base de la imagen para calcular zoom por ancho real
  baseImgWidth = 0;
  baseImgHeight = 0;
  get displayImgWidth(): number {
    // Si aún no se conoce el tamaño natural, dejar que el navegador calcule (retorna 0)
    return this.baseImgWidth > 0 ? Math.max(1, Math.round(this.baseImgWidth * this.zoomScale)) : 0;
  }

  // Estado para arrastre (pan) con el mouse
  isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private panScrollLeft = 0;
  private panScrollTop = 0;

  // Referencias para recorte
  @ViewChild('imgDoc', { static: false }) imgDocRef!: ElementRef<HTMLImageElement>;
  @ViewChild('escenario', { static: false }) escenarioRef!: ElementRef<HTMLDivElement>;

  // Estado de recorte/limpieza
  recorteActivo = false;
  isDrawing = false;
  startDrawX = 0;
  startDrawY = 0;
  endDrawX = 0;
  endDrawY = 0;
  // Selecciones acumuladas para limpieza (en coordenadas reales de la imagen)
  selecciones: Array<{ x: number; y: number; w: number; h: number }> = [];

  // Historial para retroceder (Ctrl+Z)
  private history: string[] = [];
  private readonly maxHistory = 25;

  // Separadores (rangos de páginas 1-based)
  separadores: Array<{ from: number; to: number; name: string; color: string }> = [];
  @Input() separadoresIniciales?: Array<{ from: number; to: number; name: string; color: string }>;

  // Expuesto para el template
  get canUndo(): boolean {
    return this.history.length > 0;
  }

  // Acciones realizadas con página: REV:1, ZOOM:2, LIMPIEZA:3, IMPRIMIR:4
  // Auditoría deshabilitada (rollback)

  constructor(
    public activeModal: NgbActiveModal,
    private indexacionService: IndexacionSerieService
  ) {}

  ngOnInit(): void {
    // Modo base64 (anexos vía API, sin problemas de CORS)
    if (this.pdfBase64) {
      this.modoUrl = true;
      this.cargarPdfDesdeBase64(this.pdfBase64);
      return;
    }
    // Modo anexo (imágenes convertidas por el backend)
    if (this.idAnexo) {
      this.modoAnexo = true;
      Swal.fire({ title: 'Cargando anexo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      this.cargarPagina(0);
      return;
    }
    // Modo URL (PDF por ruta directa)
    if (this.urlPdf) {
      this.modoUrl = true;
      this.cargarPdfDesdeUrl(this.urlPdf);
      return;
    }

    if (!this.idDocumento || !this.idEmpresa) {
      Swal.fire('Error', 'Faltan parámetros para visualizar el documento', 'error');
      return;
    }
    // Cargar separadores iniciales si vienen desde el padre
    if (this.separadoresIniciales && Array.isArray(this.separadoresIniciales)) {
      // Copia superficial para evitar mutar referencia externa
      this.separadores = this.separadoresIniciales.map(s => ({ ...s }));
    }
    // Inicio auditoría simple
    this._auditStart = new Date();
    this._addAccion('REVISION');
    this.enviarAlServicio();
  }

  private _auditStart: Date | null = null;

  ngOnDestroy(): void {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const id_usuario = user?.id ? Number(user.id) : null;
      if (this._auditStart && id_usuario && this.idDocumento) {
        const fin = new Date();
        const segundos = Math.max(0, Math.floor((fin.getTime() - this._auditStart.getTime()) / 1000));
        const accionStr = Array.from(this._acciones).join('|').slice(0, 50) || 'REVISION';

        // 👇 Detalle legible: tamaño del documento y qué se imprimió exactamente
        const detalleEventos = this.construirDetalleImpresion();

        this.indexacionService.registrarAuditoriaDocumental({
          id_documento: this.idDocumento,
          id_usuario,
          accion: accionStr,
          detalles_eventos: detalleEventos, // 👈 nuevo campo opcional
          fecha_inicio: this._auditStart.toISOString(),
          fecha_fin: fin.toISOString(),
          segundos_trabajados: segundos
        }).subscribe({ next: () => {}, error: () => {} });
      }
    } catch {}
  }

  /**
   * Arma el detalle de impresión para la auditoría: total de páginas del
   * documento y qué páginas se imprimieron (o si se imprimió completo).
   */
  private construirDetalleImpresion(): string {
    const total = this.totalPaginas || 0;
    const base = `Documento de ${total} página(s)`;

    const paginasUnicas = Array.from(new Set(this._paginasImpresas)).sort((a, b) => a - b);

    if (!paginasUnicas.length) {
      return `${base} | Sin impresiones`;
    }

    // Se lanzó "imprimir documento completo"
    if (this._imprimioCompleto || (total > 0 && paginasUnicas.length === total)) {
      return `${base} | Impresión: DOCUMENTO COMPLETO (${total} de ${total} páginas)`;
    }

    return `${base} | Impresión: páginas ${this.formatearRangosPaginas(paginasUnicas)}`
         + ` (${paginasUnicas.length} de ${total} páginas)`;
  }

  /** Convierte [1,2,3,7,9,10] en "1-3, 7, 9-10" para que el detalle sea legible */
  private formatearRangosPaginas(paginas: number[]): string {
    if (!paginas.length) return '';

    const rangos: string[] = [];
    let inicio = paginas[0];
    let anterior = paginas[0];

    for (let i = 1; i <= paginas.length; i++) {
      const actual = paginas[i];
      if (actual !== anterior + 1) {
        rangos.push(inicio === anterior ? `${inicio}` : `${inicio}-${anterior}`);
        inicio = actual;
      }
      anterior = actual;
    }

    return rangos.join(', ');
  }

  // ---- Auditoría simple: acumular acciones y enviar al cerrar ----
  private _acciones = new Set<string>();
  private _addAccion(tag: string) {
    if (!tag) return;
    this._acciones.add(tag.toUpperCase());
  }

  private enviarAlServicio() {
    Swal.fire({
      title: 'Cargando documento...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    this.cargarPagina(0);
  }

  // ===== Modo base64 (anexos vía API): renderizado con pdf.js =====
  private async cargarPdfDesdeBase64(base64: string) {
    Swal.fire({ title: 'Cargando documento...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      // base64 puede venir como data URL o crudo
      const limpio = base64.includes(',') ? base64.substring(base64.indexOf(',') + 1) : base64;
      const binary = atob(limpio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }

      const loadingTask = (pdfjsLib as any).getDocument({ data: bytes });
      this.pdfDocUrl = await loadingTask.promise;
      this.totalPaginas = this.pdfDocUrl.numPages;
      this.paginaActual = 0;
      this.jumpPage = 1;
      await this.renderPaginaUrl(0);
      try { Swal.close(); } catch {}
    } catch (e: any) {
      console.error('[VerDocumento] Error pdf.js (base64):', e);
      try { Swal.close(); } catch {}
      Swal.fire('Error', 'No se pudo cargar el documento. ' + (e?.message || ''), 'error');
    }
  }

  // ===== Modo URL (anexos): renderizado con pdf.js =====
  private async cargarPdfDesdeUrl(url: string) {
    Swal.fire({ title: 'Cargando documento...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const loadingTask = (pdfjsLib as any).getDocument({ url, withCredentials: false });
      this.pdfDocUrl = await loadingTask.promise;
      this.totalPaginas = this.pdfDocUrl.numPages;
      this.paginaActual = 0;
      this.jumpPage = 1;
      await this.renderPaginaUrl(0);
      try { Swal.close(); } catch {}
    } catch (e: any) {
      console.error('[VerDocumento] Error pdf.js al cargar por URL:', e);
      try { Swal.close(); } catch {}
      Swal.fire('Error', 'No se pudo cargar el documento. ' + (e?.message || e?.name || ''), 'error');
    }
  }

  // Evita que dos renderizados se pisen si se pulsa "Siguiente" varias veces
  private renderizandoUrl = false;

  private async renderPaginaUrl(index: number) {
    if (!this.pdfDocUrl) { return; }
    if (index < 0 || index >= this.totalPaginas) { return; }
    if (this.renderizandoUrl) { return; }

    this.renderizandoUrl = true;
    try {
      this.zoomScale = this.zoomInicial ?? 1;
      this.baseImgWidth = 0;
      this.baseImgHeight = 0;

      const page = await this.pdfDocUrl.getPage(index + 1); // pdf.js es 1-based
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      this.paginaMostrada = canvas.toDataURL('image/png');
      this.paginaActual = index;
      this.jumpPage = index + 1;
    } finally {
      this.renderizandoUrl = false;
    }
  }

  private cargarPagina(index: number) {
    // En modo URL/base64 renderizamos con pdf.js
    if (this.modoUrl) {
      this.renderPaginaUrl(index)
        .catch((e: any) => {
          console.error('[VerDocumento] Error al renderizar la página:', e);
          Swal.fire('Error', 'No se pudo mostrar esta página del documento.', 'error');
        })
        // El cierre va en finally: si el render falla, el "Cargando..." tiene
        // que desaparecer igual, si no el visor se queda colgado
        .finally(() => this.cerrarAvisoCargando());
      return;
    }
    try { console.log('[VerDocumento] solicitando página (0-based):', index); } catch {}
    this.paginaMostrada = '';
    // Al cambiar de página, resetear el zoom para evitar desorientar al usuario
    this.zoomScale = this.zoomInicial ?? 1;
    // Reiniciar dimensiones base (se establecerán al cargar la nueva imagen)
    this.baseImgWidth = 0;
    this.baseImgHeight = 0;
    // Limpiar historial y selecciones al cargar nueva página
    this.history = [];
    this.selecciones = [];
    this.clearParches();
    // Optimista: ajustar estado local para que los botones se comporten bien aunque el backend reporte 0
    this.paginaActual = index;

    // Modo anexo: la página la arma Imagick en el backend a partir del archivo original
    if (this.modoAnexo) {
      this.indexacionService.obtenerAnexoImagen({ id_anexo: this.idAnexo, page: index }).subscribe({
        next: (resp: any) => {
          if (resp?.success && resp.data) {
            this.paginaMostrada = resp.data.imagen; // base64
            this.totalPaginas = resp.data.total_paginas;
            this.paginaActual = resp.data.pagina_actual; // 0-based
            this.jumpPage = this.paginaActual + 1;
          } else {
            Swal.fire('Error', resp?.message || 'No se pudo cargar el anexo', 'error');
            return;
          }
          Swal.close();
        },
        error: () => {
          Swal.close();
          Swal.fire('Error', 'No se pudo cargar la página solicitada', 'error');
        }
      });
      return;
    }

    const payload = {
      idDocumento: this.idDocumento,
      idEmpresa: this.idEmpresa,
      idSerieSubserie: this.idSerieSubserie || null,
      page: index
    } as any;
    try { console.log('[VerDocumento] payload enviado:', payload); } catch {}

    this.indexacionService.obtenerDocumentoUrl(payload).subscribe({
      next: (resp: any) => {
        if (resp?.success && resp.data) {
          this.paginaMostrada = resp.data.imagen; // base64
          this.totalPaginas = resp.data.total_paginas;
          this.paginaActual = resp.data.pagina_actual; // 0-based
          // Si esta página ya fue editada en esta sesión, mostrar la versión editada
          if (this.paginasEditadas[this.paginaActual]) {
            this.paginaMostrada = this.paginasEditadas[this.paginaActual];
          }
          // Reflejar la página actual (1-based) en el input "Ir a"
          this.jumpPage = this.paginaActual + 1;
          // Guardar la ruta real del PDF (se usa para las miniaturas)
          try {
            const info = resp.data.documento;
            if (info?.ruta_completa) {
              let ruta = String(info.ruta_completa);
              const nombre = String(info.nombre_archivo || '');
              if (nombre && !ruta.endsWith(nombre)) {
                ruta = ruta.replace(/\/+$/, '') + '/' + nombre;
              }
              this.rutaDocumento = ruta;
            }
          } catch {}
          // Cargar separadores desde backend si existen
          if (Array.isArray(resp.data.separadores)) {
            try {
              const seps = resp.data.separadores
                .filter((s: any) => s && Number(s.from) >= 1 && Number(s.to) >= 1)
                .map((s: any) => ({
                  from: Number(s.from),
                  to: Number(s.to),
                  name: String(s.name || ''),
                  color: s.color || '#1976d2'
                }));
              if (seps.length) {
                this.separadores = seps;
              }
            } catch {}
          }
          // Dimensiones base se capturan en onImgLoad del <img>
          try { console.log('[VerDocumento] respuesta página_actual:', this.paginaActual, 'total:', this.totalPaginas); } catch {}
        }
        Swal.close();
      },
      error: () => {
        Swal.close();
        Swal.fire('Error', 'No se pudo cargar la página solicitada', 'error');
      }
    });
  }

  /**
   * Aviso de "Cargando..." al cambiar de página.
   * En modo pdf.js (URL/base64) NO se muestra: el documento ya está en memoria
   * y el render es inmediato, así que el aviso alcanzaba a abrirse pero no a
   * cerrarse (SweetAlert ignora un close durante la animación de apertura) y
   * el visor se quedaba con el spinner puesto.
   */
  private avisoCargandoPagina() {
    if (this.modoUrl) { return; }
    Swal.fire({ title: 'Cargando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  }

  /**
   * Cierra el aviso de carga. Se reintenta una vez porque SweetAlert ignora
   * un close() lanzado mientras el aviso todavía se está abriendo, y ahí es
   * donde antes se quedaba el spinner girando sin fin.
   */
  private cerrarAvisoCargando() {
    try { Swal.close(); } catch {}
    setTimeout(() => {
      try { if (Swal.isVisible()) { Swal.close(); } } catch {}
    }, 250);
  }

  paginaAnterior() {
    if (this.paginaActual > 0) {
      this.avisoCargandoPagina();
      this.cargarPagina(this.paginaActual - 1);
    }
  }

  siguientePagina() {
    if (this.paginaActual < this.totalPaginas - 1) {
      this.avisoCargandoPagina();
      this.cargarPagina(this.paginaActual + 1);
    }
  }

  /**
   * Trae el PDF del documento una sola vez (como base64, vía API para evitar
   * CORS) y lo deja abierto con pdf.js para dibujar miniaturas.
   */
  private cargarPdfDocumentoParaMiniaturas(): Promise<any> {
    if (this.pdfDocMiniaturas) { return Promise.resolve(this.pdfDocMiniaturas); }
    if (!this.rutaDocumento) { return Promise.resolve(null); }

    return new Promise((resolve) => {
      this.indexacionService.verAnexoBase64(this.rutaDocumento as string).subscribe({
        next: async (resp: any) => {
          if (!resp?.success || !resp?.base64) { resolve(null); return; }
          try {
            const binary = atob(resp.base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
            this.pdfDocMiniaturas = await (pdfjsLib as any).getDocument({ data: bytes }).promise;
            resolve(this.pdfDocMiniaturas);
          } catch { resolve(null); }
        },
        error: () => resolve(null)
      });
    });
  }

  // --- Ingresar una hoja al documento ---
  // Sube una hoja (imagen o PDF) y la intercala en la página indicada.
  // El resultado se guarda como una nueva versión del expediente.
  async ingresarHoja() {
    if (!this.idDocumento) {
      Swal.fire('Aviso', 'Solo se pueden insertar hojas en documentos del expediente.', 'info');
      return;
    }
    if (this.totalPaginas <= 0) {
      Swal.fire('Aviso', 'Aún no hay páginas cargadas.', 'info');
      return;
    }

    const total = this.totalPaginas;
    const actual = this.paginaActual + 1;        // 1-based
    const sugerida = Math.min(actual + 1, total + 1); // por defecto: después de la que se está viendo

    let archivo: File | null = null;
    let imgPreviewUrl: string | null = null; // vista previa cuando la hoja es una imagen
    let hojasArchivo = 1;              // cuántas hojas se van a insertar
    let totalHojasArchivo = 1;         // cuántas hojas trae el archivo elegido
    let seleccionHojas: number[] = []; // hojas elegidas del PDF (1-based); vacío si no es PDF
    let selectorActivo = false;        // ya se armó la grilla de hojas del archivo
    let docArchivo: any = null;        // PDF que se sube, abierto con pdf.js
    // Orden que tendrá el documento final: 'doc' = página que ya está en el
    // servidor, 'new' = hoja del archivo que se sube
    let disposicion: Array<{ tipo: 'doc' | 'new'; num: number }> = [];

    const { value: datos } = await Swal.fire<{ posicion: number }>({
      title: 'Ingresar una hoja al documento',
      html: `
        <div class="text-start">
          <div class="d-flex align-items-center mb-4">
            <span class="badge badge-light-primary fs-7 fw-bold">HOJA A INSERTAR</span>
            <div class="separator separator-dashed flex-grow-1 ms-4"></div>
          </div>

          <div id="hj-drop" class="dropzone d-flex flex-center border-dashed border-primary p-6 bg-light-primary rounded mb-4 cursor-pointer">
            <input id="hj-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff" class="d-none">
            <div class="text-center">
              <i class="ki-duotone ki-cloud-upload fs-3x text-primary"><span class="path1"></span><span class="path2"></span></i>
              <h3 class="fs-5 fw-bold text-gray-900 mt-4">Arrastra aquí o haz clic para subir</h3>
              <span class="text-muted fs-7">Imagen escaneada o PDF (Máx. 20MB)</span>
            </div>
          </div>

          <div id="hj-lista" class="table-responsive mb-5 d-none">
            <table class="table align-middle gs-0 gy-3 mb-0">
              <thead>
                <tr class="fw-bold text-muted border-bottom-1">
                  <th class="ps-4 min-w-250px rounded-start">Nombre del Archivo</th>
                  <th class="min-w-100px text-end">Tamaño</th>
                  <th class="min-w-50px text-end"></th>
                </tr>
              </thead>
              <tbody id="hj-lista-body"></tbody>
            </table>
          </div>

          <div class="row g-5">
            <!-- Izquierda: hojas del archivo que se sube -->
            <div class="col-lg-6">
              <div id="hj-paginas" class="d-none">
                <div class="d-flex align-items-center mb-4">
                  <span class="badge badge-light-primary fs-7 fw-bold">HOJAS DEL ARCHIVO</span>
                  <div class="separator separator-dashed flex-grow-1 ms-4"></div>
                </div>
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <span class="text-gray-700 fs-7">Marque las hojas y arrástrelas a la derecha. <span id="hj-pag-count" class="fw-bold"></span></span>
                  <div class="d-flex gap-2">
                    <button type="button" id="hj-todas" class="btn btn-sm btn-light-primary py-1 px-3">Todas</button>
                    <button type="button" id="hj-ninguna" class="btn btn-sm btn-light py-1 px-3">Ninguna</button>
                  </div>
                </div>
                <div id="hj-pag-grid" class="d-flex flex-wrap gap-3 p-3 bg-light rounded" style="max-height:420px; overflow-y:auto"></div>
              </div>
            </div>

            <!-- Derecha: cómo va a quedar el documento -->
            <div class="col-lg-6">
              <div class="d-flex align-items-center mb-4">
                <span class="badge badge-light-primary fs-7 fw-bold">UBICACIÓN</span>
                <div class="separator separator-dashed flex-grow-1 ms-4"></div>
              </div>

              <label class="fw-semibold text-gray-700 fs-7">¿En qué página entran las hojas nuevas?</label>
              <input id="hj-pos" type="number" min="1" max="${total + 1}" value="${sugerida}"
                     class="form-control form-control-solid mt-2 mb-2">
              <span class="text-muted fs-7">De 1 a ${total + 1} (el documento tiene ${total} páginas). Entran todas juntas aquí y luego puede mover cada una.</span>

              <div id="hj-doc" class="mt-4 d-none">
                <div class="text-gray-700 fs-7 mb-2">
                  Cómo quedará el documento
                  <span class="text-muted">— suelte aquí las hojas y arrastre cada hoja verde para moverla de página</span>
                </div>
                <div id="hj-doc-grid" class="d-flex flex-wrap gap-3 p-3 bg-light rounded" style="max-height:420px; overflow-y:auto"></div>
              </div>
            </div>
          </div>

          <div id="hj-resumen" class="notice bg-light-primary rounded border-primary border border-dashed p-4 mt-5 text-gray-800 fs-7"></div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Insertar hoja',
      cancelButtonText: '<i class="fa fa-xmark fs-4"></i>',
      width: '1180px',
      heightAuto: true,
      // Botones a la derecha, con los colores de Metronic (azul / rojo)
      buttonsStyling: false,
      customClass: {
        popup: 'sw-hoja',
        actions: 'm-0',
        confirmButton: 'btn btn-primary me-3',
        cancelButton: 'btn btn-icon btn-danger'
      },
      didOpen: () => {
        // Aprovechar el alto de la pantalla: el contenido se ve completo y,
        // si la ventana es baja, el scroll queda dentro del cuerpo del modal
        try {
          const popupEl = Swal.getPopup();
          if (popupEl) {
            popupEl.style.maxHeight = '94vh';
            popupEl.style.maxWidth = '95vw';
            popupEl.style.position = 'relative';
          }
          // Botones en la esquina superior derecha, para no robarle alto a las hojas
          const cancelEl = Swal.getCancelButton();
          if (cancelEl) {
            cancelEl.setAttribute('title', 'Cerrar');
            cancelEl.setAttribute('aria-label', 'Cerrar');
          }
          const actionsEl = Swal.getActions();
          if (actionsEl) {
            actionsEl.style.position = 'absolute';
            actionsEl.style.top = '14px';
            actionsEl.style.right = '18px';
            actionsEl.style.width = 'auto';
            actionsEl.style.margin = '0';
            actionsEl.style.zIndex = '2';
          }
          const htmlEl = Swal.getHtmlContainer();
          if (htmlEl) {
            htmlEl.style.maxHeight = 'calc(94vh - 120px)';
            htmlEl.style.overflowY = 'auto';
            // Que abra siempre arriba (en la zona de carga), no en el campo de página
            setTimeout(() => {
              (document.activeElement as HTMLElement)?.blur?.();
              htmlEl.scrollTop = 0;
            }, 0);
          }
        } catch {}

        const dropEl = document.getElementById('hj-drop') as HTMLDivElement | null;
        const fileEl = document.getElementById('hj-file') as HTMLInputElement | null;
        const listaEl = document.getElementById('hj-lista') as HTMLDivElement | null;
        const listaBodyEl = document.getElementById('hj-lista-body') as HTMLElement | null;
        const paginasEl = document.getElementById('hj-paginas') as HTMLDivElement | null;
        const gridEl = document.getElementById('hj-pag-grid') as HTMLDivElement | null;
        const contadorEl = document.getElementById('hj-pag-count') as HTMLSpanElement | null;
        const posEl = document.getElementById('hj-pos') as HTMLInputElement | null;
        const resumenEl = document.getElementById('hj-resumen') as HTMLDivElement | null;

        const leerPos = () => {
          const n = Number(posEl?.value);
          if (!Number.isFinite(n)) return sugerida;
          return Math.max(1, Math.min(total + 1, Math.round(n)));
        };

        // Deja siempre visible en qué página va a quedar cada hoja
        const pintarResumen = () => {
          if (!resumenEl) return;
          if (hojasArchivo <= 0) {
            resumenEl.innerHTML = 'Marque al menos una hoja del archivo para poder insertarla.';
            return;
          }
          const nuevoTotal = total + hojasArchivo;

          // Con el orden ya armado se dicen las páginas exactas
          const destinos = disposicion
            .map((it, i) => (it.tipo === 'new' ? i + 1 : 0))
            .filter(n => n > 0);

          if (destinos.length) {
            const lista = destinos.length === 1
              ? `la <b>página ${destinos[0]}</b>`
              : `las <b>páginas ${destinos.slice(0, -1).join(', ')} y ${destinos[destinos.length - 1]}</b>`;
            resumenEl.innerHTML =
              `${destinos.length === 1 ? 'La hoja nueva quedará en' : `Las ${destinos.length} hojas nuevas quedarán en`} ${lista} de ${nuevoTotal}.` +
              `<br>Puede arrastrar cada hoja verde para moverla de lugar.`;
            return;
          }

          const pos = leerPos();
          const detalle = hojasArchivo === 1
            ? `La hoja nueva quedará como <b>página ${pos}</b> de ${nuevoTotal}.`
            : `Las <b>${hojasArchivo} hojas</b> nuevas quedarán como <b>páginas ${pos} a ${pos + hojasArchivo - 1}</b> de ${nuevoTotal}.`;
          const corrimiento = pos > total
            ? 'Se agregan al final del documento.'
            : `Lo que hoy es la página ${pos} pasa a ser la ${pos + hojasArchivo}.`;
          resumenEl.innerHTML = `${detalle}<br>${corrimiento}`;
        };

        // Fila del archivo elegido (mismo estilo que la tabla de anexos)
        const pintarLista = () => {
          if (!listaEl || !listaBodyEl) return;
          if (!archivo) {
            listaBodyEl.innerHTML = '';
            listaEl.classList.add('d-none');
            dropEl?.classList.remove('d-none');
            return;
          }
          const ext = (archivo.name.split('.').pop() || '').toLowerCase();
          const esPdf = ext === 'pdf';
          const peso = `${(archivo.size / 1024 / 1024).toFixed(2)} MB`;
          const hojasTxt = totalHojasArchivo > 1
            ? ` <span class="text-muted fs-8">(${hojasArchivo} de ${totalHojasArchivo} hojas)</span>`
            : '';

          listaBodyEl.innerHTML = `
            <tr>
              <td>
                <div class="d-flex align-items-center">
                  <div class="symbol symbol-40px me-5">
                    <span class="symbol-label ${esPdf ? 'bg-light-danger' : 'bg-light-success'}">
                      <i class="ki-duotone ki-file fs-2x ${esPdf ? 'text-danger' : 'text-success'}"><span class="path1"></span><span class="path2"></span></i>
                    </span>
                  </div>
                  <span class="text-gray-800 fw-bold fs-6">${archivo.name}${hojasTxt}</span>
                </div>
              </td>
              <td class="text-end fw-bold text-gray-600">${peso}</td>
              <td class="text-end">
                <button type="button" id="hj-quitar" class="btn btn-icon btn-light-danger btn-sm">
                  <i class="ki-duotone ki-trash fs-2"><span class="path1"></span><span class="path2"></span><span class="path3"></span><span class="path4"></span><span class="path5"></span></i>
                </button>
              </td>
            </tr>
          `;
          listaEl.classList.remove('d-none');
          // Con una hoja ya elegida no hace falta seguir mostrando la zona de carga
          dropEl?.classList.add('d-none');

          document.getElementById('hj-quitar')?.addEventListener('click', () => {
            if (fileEl) fileEl.value = '';
            asignarArchivo(null);
          });
        };

        // Se completan más abajo, cuando existe la grilla del documento destino
        let habilitarArrastre: (card: HTMLElement) => void = () => {};
        let refrescarPreview: () => void = () => {};

        // Contador "N de M hojas seleccionadas" + estado visual de cada tarjeta
        const refrescarSeleccion = () => {
          hojasArchivo = selectorActivo ? seleccionHojas.length : (archivo ? 1 : 0);
          if (contadorEl) {
            contadorEl.textContent = selectorActivo
              ? `${seleccionHojas.length} de ${totalHojasArchivo} seleccionadas.`
              : '';
          }
          gridEl?.querySelectorAll('.hj-card').forEach((card: any) => {
            const marcada = card.querySelector('input')?.checked;
            card.style.borderColor = marcada ? '#009ef7' : '#e4e6ef';
            card.style.background = marcada ? '#f1faff' : '#fff';
          });
          pintarLista();
          pintarResumen();
          refrescarPreview();
        };

        // Selector de hojas: una tarjeta por página del archivo (o una sola
        // tarjeta si lo que se sube es una imagen)
        const construirSelectorHojas = async (doc: any) => {
          if (!paginasEl || !gridEl || !archivo) return;

          const esImagen = !doc;
          // Con muchas hojas no se dibujan miniaturas (tarda demasiado)
          const conMiniaturas = totalHojasArchivo <= 40;
          const marco = 'width:88px; background:#fff; border:1px solid #eff2f5; border-radius:4px';

          gridEl.innerHTML = Array.from({ length: totalHojasArchivo }, (_, i) => {
            const p = i + 1;
            let vista: string;
            if (esImagen) {
              vista = `<img src="${imgPreviewUrl}" style="${marco}">`;
            } else if (conMiniaturas) {
              vista = `<canvas id="hj-thumb-${p}" width="88" height="114" style="${marco}"></canvas>`;
            } else {
              vista = `<div style="${marco}; height:70px; display:flex; align-items:center; justify-content:center" class="fs-2 fw-bold text-gray-500">${p}</div>`;
            }
            // Las hojas del PDF arrancan sin marcar: el usuario elige cuáles entran
            const marcada = seleccionHojas.includes(p);
            return `
              <label class="hj-card text-center" draggable="true" data-pagina="${p}" title="Arrastre esta hoja hasta la página del documento donde debe entrar"
                     style="width:104px; padding:6px; border:2px solid ${marcada ? '#009ef7' : '#e4e6ef'}; border-radius:8px; background:${marcada ? '#f1faff' : '#fff'}; cursor:grab">
                ${vista}
                <div class="mt-2 fs-8 text-gray-700">
                  <input type="checkbox" class="form-check-input hj-pg" value="${p}" ${marcada ? 'checked' : ''} style="width:14px; height:14px; vertical-align:middle">
                  ${esImagen ? 'Hoja' : `Pág. ${p}`}
                </div>
              </label>
            `;
          }).join('');
          selectorActivo = true;

          paginasEl.classList.remove('d-none');

          gridEl.querySelectorAll('input.hj-pg').forEach((chk: any) => {
            chk.addEventListener('change', () => {
              const p = Number(chk.value);
              if (chk.checked) {
                if (!seleccionHojas.includes(p)) { seleccionHojas.push(p); seleccionHojas.sort((a, b) => a - b); }
              } else {
                seleccionHojas = seleccionHojas.filter(x => x !== p);
              }
              refrescarSeleccion();
            });
          });

          // Cada hoja se puede arrastrar hasta la página de destino
          gridEl.querySelectorAll('.hj-card').forEach((card: any) => habilitarArrastre(card));

          const marcarTodas = (valor: boolean) => {
            gridEl.querySelectorAll('input.hj-pg').forEach((chk: any) => { chk.checked = valor; });
            seleccionHojas = valor ? Array.from({ length: totalHojasArchivo }, (_, i) => i + 1) : [];
            refrescarSeleccion();
          };
          document.getElementById('hj-todas')?.addEventListener('click', () => marcarTodas(true));
          document.getElementById('hj-ninguna')?.addEventListener('click', () => marcarTodas(false));

          if (esImagen || !conMiniaturas) {
            refrescarPreview();
            return;
          }

          // Miniaturas una por una para no congelar el navegador
          for (let p = 1; p <= totalHojasArchivo; p++) {
            const canvas = document.getElementById(`hj-thumb-${p}`) as HTMLCanvasElement | null;
            if (!canvas) { break; } // el modal se cerró
            try {
              const page = await doc.getPage(p);
              const base = page.getViewport({ scale: 1 });
              const viewport = page.getViewport({ scale: 88 / base.width });
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              canvas.style.height = 'auto';
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            } catch {}
          }

          // Ya hay miniaturas para copiar en la vista previa del documento
          refrescarPreview();
        };

        const asignarArchivo = async (f: File | null) => {
          archivo = f;
          hojasArchivo = 1;
          totalHojasArchivo = 1;
          seleccionHojas = [];
          selectorActivo = false;
          docArchivo = null;
          paginasEl?.classList.add('d-none');
          if (gridEl) { gridEl.innerHTML = ''; }
          if (imgPreviewUrl) { URL.revokeObjectURL(imgPreviewUrl); imgPreviewUrl = null; }

          if (archivo) {
            const ext = (archivo.name.split('.').pop() || '').toLowerCase();
            if (!['pdf', 'jpg', 'jpeg', 'png', 'tif', 'tiff'].includes(ext)) {
              archivo = null;
              if (fileEl) fileEl.value = '';
              Swal.showValidationMessage('Formato no permitido. Suba una imagen (JPG, PNG, TIF) o un PDF.');
            } else if (archivo.size > 20 * 1024 * 1024) {
              archivo = null;
              if (fileEl) fileEl.value = '';
              Swal.showValidationMessage('El archivo no puede pesar más de 20 MB.');
            } else {
              Swal.resetValidationMessage();
              // Si es PDF se listan sus hojas para poder elegir cuáles entran
              if (ext === 'pdf') {
                try {
                  const buffer = await archivo.arrayBuffer();
                  const doc = await (pdfjsLib as any).getDocument({ data: new Uint8Array(buffer) }).promise;
                  docArchivo = doc;
                  totalHojasArchivo = doc.numPages || 1;
                  // Ninguna hoja viene marcada: el usuario elige cuáles insertar
                  hojasArchivo = 0;
                  seleccionHojas = [];
                  pintarLista();
                  pintarResumen();
                  refrescarPreview();
                  construirSelectorHojas(doc);
                  return;
                } catch {
                  totalHojasArchivo = 1;
                  hojasArchivo = 1;
                  seleccionHojas = [];
                }
              } else {
                // Imagen suelta: es una única hoja y se previsualiza tal cual
                imgPreviewUrl = URL.createObjectURL(archivo);
                seleccionHojas = [1];
                pintarLista();
                pintarResumen();
                construirSelectorHojas(null);
                return;
              }
            }
          }

          pintarLista();
          pintarResumen();
          refrescarPreview();
        };

        posEl?.addEventListener('input', pintarResumen);

        dropEl?.addEventListener('click', () => fileEl?.click());
        fileEl?.addEventListener('change', () => {
          asignarArchivo(fileEl.files && fileEl.files.length ? fileEl.files[0] : null);
        });

        // Arrastrar y soltar
        ['dragenter', 'dragover'].forEach(ev => {
          dropEl?.addEventListener(ev, (e: any) => {
            e.preventDefault();
            dropEl.classList.add('bg-light-success');
          });
        });
        ['dragleave', 'drop'].forEach(ev => {
          dropEl?.addEventListener(ev, (e: any) => {
            e.preventDefault();
            dropEl.classList.remove('bg-light-success');
          });
        });
        dropEl?.addEventListener('drop', (e: any) => {
          const archivos = e.dataTransfer?.files;
          if (archivos && archivos.length) { asignarArchivo(archivos[0]); }
        });

        // --- Vista previa del documento final (páginas del servidor + hojas nuevas) ---
        const docEl = document.getElementById('hj-doc') as HTMLDivElement | null;
        const docGridEl = document.getElementById('hj-doc-grid') as HTMLDivElement | null;

        const tarjetasDoc = new Map<number, HTMLElement>();    // páginas ya guardadas
        const tarjetasNuevas = new Map<number, HTMLElement>(); // hojas del archivo
        let cardFinal: HTMLElement | null = null;              // zona "al final"
        let moviendo: number | null = null;                    // hoja que se está moviendo

        const hojasElegidas = () => (archivo && hojasArchivo > 0)
          ? (seleccionHojas.length ? seleccionHojas : [1])
          : [];

        // Arma el orden desde cero: todas las hojas juntas en la posición base
        const reconstruirDisposicion = () => {
          const pos = leerPos();
          const hojas = hojasElegidas();
          disposicion = [];
          for (let p = 1; p <= total; p++) {
            if (p === pos) { hojas.forEach(h => disposicion.push({ tipo: 'new', num: h })); }
            disposicion.push({ tipo: 'doc', num: p });
          }
          if (pos > total) { hojas.forEach(h => disposicion.push({ tipo: 'new', num: h })); }
        };

        // Vuelca el orden al DOM. Sólo mueve nodos, así las miniaturas ya
        // dibujadas no se pierden, y renumera todas las tarjetas
        // Título de separador: ocupa toda la fila y corta el listado en bloques.
        // El rango se calcula sobre el orden final, así que si insertas hojas
        // dentro del separador el título ya muestra las páginas que tendrá.
        const crearTituloSeparador = (sep: { from: number; to: number; name: string; color: string }, inicioFinal: number) => {
          // Dónde cae la última página del separador una vez insertadas las hojas
          const indiceFin = disposicion.findIndex(it => it.tipo === 'doc' && it.num === sep.to);
          const finFinal = indiceFin >= 0 ? indiceFin + 1 : inicioFinal;
          const cambio = (inicioFinal !== sep.from || finFinal !== sep.to);

          const titulo = document.createElement('div');
          titulo.className = 'hj-sep-titulo d-flex align-items-center gap-2';
          titulo.style.cssText = 'flex:0 0 100%; width:100%; margin:6px 0 2px; padding-top:6px; border-top:1px dashed #d7dae2';
          titulo.innerHTML = `
            <span class="badge fs-8 fw-bold" style="background:${sep.color}; color:#fff">
              ${sep.name || 'Separador'}
            </span>
            <span class="text-muted fs-8">Pág. ${inicioFinal} a ${finFinal}</span>
            ${cambio ? `<span class="fs-8 fw-semibold" style="color:#50cd89">· antes ${sep.from} a ${sep.to}</span>` : ''}
          `;
          return titulo;
        };

        const pintarDisposicion = () => {
          if (!docGridEl) return;

          // Los títulos se rehacen en cada pasada; las tarjetas solo se mueven
          docGridEl.querySelectorAll('.hj-sep-titulo').forEach(n => n.remove());

          disposicion.forEach((it, i) => {
            const card = it.tipo === 'doc' ? tarjetasDoc.get(it.num) : tarjetasNuevas.get(it.num);
            if (!card) return;

            // Si esta página abre un separador, primero va su título. Los
            // rangos son del documento original, por eso solo aplica a las
            // páginas que ya estaban ('doc'), no a las hojas que se insertan.
            if (it.tipo === 'doc') {
              const sep = this.separadores.find(s => s.from === it.num);
              if (sep) { docGridEl.appendChild(crearTituloSeparador(sep, i + 1)); }
            }

            docGridEl.appendChild(card);
            const label = card.querySelector('.hj-num') as HTMLElement | null;
            if (label) { label.textContent = `Pág. ${i + 1}`; }
          });

          if (cardFinal) { docGridEl.appendChild(cardFinal); }
          pintarResumen();
        };

        // Mueve la hoja que se está arrastrando delante de la posición indicada
        const moverHoja = (indiceDestino: number) => {
          if (moviendo === null) return;
          const desde = disposicion.findIndex(it => it.tipo === 'new' && it.num === moviendo);
          if (desde < 0) return;
          const [item] = disposicion.splice(desde, 1);
          let destino = indiceDestino;
          if (desde < destino) { destino--; } // se corrió al sacarla
          disposicion.splice(Math.max(0, Math.min(disposicion.length, destino)), 0, item);
          pintarDisposicion();
        };

        // Página base equivalente a una posición del orden (para el campo numérico)
        const paginaBaseDesde = (indice: number) => {
          for (let i = indice; i < disposicion.length; i++) {
            if (disposicion[i].tipo === 'doc') { return disposicion[i].num; }
          }
          return total + 1;
        };

        // Fija la posición base y rearma el orden
        const fijarPosicion = (pagina: number | string) => {
          if (posEl) { posEl.value = String(pagina); }
          reconstruirDisposicion();
          pintarDisposicion();
        };
        posEl?.addEventListener('input', () => { reconstruirDisposicion(); pintarDisposicion(); });

        // Cualquier tarjeta de la grilla recibe hojas: las de arriba (insertar)
        // y las verdes que ya están colocadas (mover)
        const habilitarDestino = (card: HTMLElement) => {
          card.addEventListener('dragover', (e: any) => {
            e.preventDefault();
            try { e.dataTransfer.dropEffect = moviendo !== null ? 'move' : 'copy'; } catch {}
            card.style.boxShadow = 'inset 4px 0 0 0 #50cd89';
          });
          card.addEventListener('dragleave', () => { card.style.boxShadow = 'none'; });
          card.addEventListener('drop', (e: any) => {
            e.preventDefault();
            e.stopPropagation();
            card.style.boxShadow = 'none';
            const indice = Array.from(docGridEl?.children || []).indexOf(card);
            if (moviendo !== null) {
              moverHoja(indice < 0 ? disposicion.length : indice);
              return;
            }
            fijarPosicion(paginaBaseDesde(indice < 0 ? disposicion.length : indice));
          });
        };

        // Tarjeta verde de una hoja nueva: copia la miniatura ya dibujada en el
        // selector de arriba en lugar de volver a renderizarla
        const crearTarjetaNueva = (paginaOrigen: number): HTMLElement => {
          const card = document.createElement('div');
          card.className = 'hj-newcard text-center position-relative';
          card.style.cssText = 'width:104px; padding:6px; border:2px solid #50cd89; border-radius:8px; background:#e8fff3; cursor:grab';
          card.setAttribute('draggable', 'true');
          card.title = 'Arrastre esta hoja para moverla a otra página';

          const badge = document.createElement('span');
          badge.className = 'badge badge-success position-absolute top-0 start-50 translate-middle fs-9';
          badge.textContent = 'NUEVA';
          card.appendChild(badge);

          const marco = 'width:88px; background:#fff; border:1px solid #eff2f5; border-radius:4px';
          const origen = document.getElementById(`hj-thumb-${paginaOrigen}`) as HTMLCanvasElement | null;

          if (origen && origen.width) {
            const copia = document.createElement('canvas');
            copia.width = origen.width;
            copia.height = origen.height;
            copia.style.cssText = `${marco}; height:auto`;
            copia.getContext('2d')?.drawImage(origen, 0, 0);
            card.appendChild(copia);
          } else if (imgPreviewUrl) {
            const img = document.createElement('img');
            img.src = imgPreviewUrl;
            img.style.cssText = marco;
            card.appendChild(img);
          } else if (docArchivo) {
            // No hay miniatura que copiar (archivo con muchas hojas): se dibuja aquí
            const canvas = document.createElement('canvas');
            canvas.width = 88;
            canvas.height = 114;
            canvas.style.cssText = `${marco}; height:auto`;
            card.appendChild(canvas);
            (async () => {
              try {
                const page = await docArchivo.getPage(paginaOrigen);
                const base = page.getViewport({ scale: 1 });
                const viewport = page.getViewport({ scale: 88 / base.width });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
              } catch {}
            })();
          } else {
            const ph = document.createElement('div');
            ph.className = 'fs-2 fw-bold text-gray-500';
            ph.style.cssText = `${marco}; height:70px; display:flex; align-items:center; justify-content:center`;
            ph.textContent = String(paginaOrigen);
            card.appendChild(ph);
          }

          const label = document.createElement('div');
          label.className = 'hj-num mt-2 fs-8 fw-bold text-success';
          card.appendChild(label);

          // Moverla dentro del documento
          card.addEventListener('dragstart', (e: any) => {
            moviendo = paginaOrigen;
            try {
              e.dataTransfer.setData('text/plain', 'mover');
              e.dataTransfer.effectAllowed = 'move';
            } catch {}
            card.style.opacity = '0.5';
          });
          card.addEventListener('dragend', () => {
            moviendo = null;
            card.style.opacity = '1';
          });
          habilitarDestino(card);

          return card;
        };

        // Rehace las tarjetas verdes y vuelve a armar el orden desde la posición base
        refrescarPreview = () => {
          if (!docGridEl) return;
          tarjetasNuevas.forEach(card => card.remove());
          tarjetasNuevas.clear();
          hojasElegidas().forEach(h => tarjetasNuevas.set(h, crearTarjetaNueva(h)));
          reconstruirDisposicion();
          pintarDisposicion();
        };

        // Arrastrar hojas desde el selector de arriba hasta una página del documento
        habilitarArrastre = (card: HTMLElement) => {
          card.addEventListener('dragstart', (e: any) => {
            // Si la hoja arrastrada no estaba marcada, se marca (se insertan
            // todas las marcadas, no sólo la que se arrastra)
            const chk = card.querySelector('input') as HTMLInputElement | null;
            const p = Number(card.dataset['pagina']);
            if (chk && !chk.checked) {
              chk.checked = true;
              if (!seleccionHojas.includes(p)) { seleccionHojas.push(p); seleccionHojas.sort((a, b) => a - b); }
              refrescarSeleccion();
            }
            try {
              e.dataTransfer.setData('text/plain', 'hojas');
              e.dataTransfer.effectAllowed = 'copy';
            } catch {}
            card.style.opacity = '0.5';
            docGridEl?.classList.add('border', 'border-primary', 'border-dashed');
          });
          card.addEventListener('dragend', () => {
            card.style.opacity = '1';
            docGridEl?.classList.remove('border', 'border-primary', 'border-dashed');
          });
        };

        (async () => {
          const doc = await this.cargarPdfDocumentoParaMiniaturas();
          if (!doc || !docEl || !docGridEl) return;

          // Con muchas páginas sólo se numeran (dibujarlas todas tardaría)
          const conMiniaturas = total <= 40;
          const marco = 'width:88px; background:#fff; border:1px solid #eff2f5; border-radius:4px';

          for (let p = 1; p <= total; p++) {
            const card = document.createElement('div');
            card.className = 'hj-dcard text-center position-relative';
            card.dataset['pagina'] = String(p);
            card.style.cssText = 'width:104px; padding:6px; border:2px solid #e4e6ef; border-radius:8px; background:#fff; cursor:pointer';

            if (conMiniaturas) {
              const canvas = document.createElement('canvas');
              canvas.id = `hj-dthumb-${p}`;
              canvas.width = 88;
              canvas.height = 114;
              canvas.style.cssText = marco;
              card.appendChild(canvas);
            } else {
              const ph = document.createElement('div');
              ph.className = 'fs-2 fw-bold text-gray-500';
              ph.style.cssText = `${marco}; height:70px; display:flex; align-items:center; justify-content:center`;
              ph.textContent = String(p);
              card.appendChild(ph);
            }

            const label = document.createElement('div');
            label.className = 'hj-num mt-2 fs-8 text-gray-700';
            label.textContent = `Pág. ${p}`;
            card.appendChild(label);

            card.addEventListener('click', () => fijarPosicion(p));
            habilitarDestino(card);

            tarjetasDoc.set(p, card);
            docGridEl.appendChild(card);
          }

          // Última tarjeta: dejar las hojas al final del documento
          cardFinal = document.createElement('div');
          cardFinal.className = 'hj-dcard text-center d-flex flex-column justify-content-center align-items-center';
          cardFinal.dataset['pagina'] = String(total + 1);
          cardFinal.style.cssText = 'width:104px; padding:6px; border:2px dashed #e4e6ef; border-radius:8px; background:#fff; cursor:pointer';
          cardFinal.innerHTML = `
            <div style="width:88px; height:70px; display:flex; align-items:center; justify-content:center" class="fs-1 fw-bold text-gray-500">+</div>
            <div class="mt-2 fs-8 text-gray-700">Al final</div>
          `;
          cardFinal.addEventListener('click', () => fijarPosicion(total + 1));
          habilitarDestino(cardFinal);
          docGridEl.appendChild(cardFinal);

          docEl.classList.remove('d-none');
          refrescarPreview();

          if (!conMiniaturas) return;

          // Se dibujan de a una para no congelar el navegador
          for (let p = 1; p <= total; p++) {
            const canvas = document.getElementById(`hj-dthumb-${p}`) as HTMLCanvasElement | null;
            if (!canvas) { break; } // el modal se cerró
            try {
              const page = await doc.getPage(p);
              const base = page.getViewport({ scale: 1 });
              const viewport = page.getViewport({ scale: 88 / base.width });
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              canvas.style.height = 'auto';
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            } catch {}
          }
        })();

        pintarResumen();
      },
      preConfirm: () => {
        if (!archivo) {
          Swal.showValidationMessage('Seleccione la hoja que desea insertar.');
          return null as any;
        }
        if (archivo.size > 20 * 1024 * 1024) {
          Swal.showValidationMessage('El archivo no puede pesar más de 20 MB.');
          return null as any;
        }
        if (hojasArchivo <= 0) {
          Swal.showValidationMessage('Marque al menos una hoja del archivo.');
          return null as any;
        }
        const posEl = document.getElementById('hj-pos') as HTMLInputElement | null;
        const pos = Math.max(1, Math.min(total + 1, Math.round(Number(posEl?.value))));
        if (!Number.isFinite(pos)) {
          Swal.showValidationMessage(`Indique una página entre 1 y ${total + 1}.`);
          return null as any;
        }
        return { posicion: pos } as any;
      }
    });

    if (imgPreviewUrl) { URL.revokeObjectURL(imgPreviewUrl); imgPreviewUrl = null; }
    if (!datos || !archivo) return;

    let usuario_id: number | null = null;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      usuario_id = user?.id ? Number(user.id) : null;
    } catch {}

    Swal.fire({
      title: hojasArchivo > 1 ? 'Insertando las hojas...' : 'Insertando la hoja...',
      text: 'Reconstruyendo el documento, espere por favor.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.indexacionService.insertarPaginaDocumento({
      id_documento: this.idDocumento,
      posicion: datos.posicion,
      archivo,
      // Sólo las hojas marcadas del PDF (vacío = el archivo completo)
      paginas: seleccionHojas.length ? seleccionHojas.join(',') : undefined,
      // Orden final exacto: dN = página del documento, nN = hoja del archivo
      disposicion: disposicion.length
        ? disposicion.map(it => (it.tipo === 'doc' ? `d${it.num}` : `n${it.num}`)).join(',')
        : undefined,
      usuario_id
    }).subscribe({
      next: (resp: any) => {
        Swal.close();
        if (resp?.success) {
          Swal.fire({
            icon: 'success',
            title: 'Hoja insertada',
            text: resp?.message || `La hoja quedó como página ${datos.posicion}.`,
            confirmButtonColor: '#28a745'
          }).then(() => {
            // Se generó una versión nueva: el padre refresca la lista
            this.activeModal.close({ accion: 'nueva_version' });
          });
        } else {
          Swal.fire('Aviso', resp?.message || 'No se pudo insertar la hoja.', 'info');
        }
      },
      error: (err: any) => {
        Swal.close();
        console.error('Error insertando hoja:', err);
        Swal.fire('Error', err?.error?.message || 'No se pudo insertar la hoja.', 'error');
      }
    });
  }

  // --- Separadores ---
  async ingresarSeparadores() {
    if (this.totalPaginas <= 0) {
      Swal.fire('Aviso', 'Aún no hay páginas cargadas.', 'info');
      return;
    }

    const defectoDesde = this.paginaActual + 1; // 1-based sugerido
    const defectoHasta = Math.min(this.totalPaginas, defectoDesde);
    const defectoNombre = `Separador ${this.separadores.length + 1}`;
    const defectoColor = '#1976d2';

    const { value: formValues } = await Swal.fire<{ nombre: string; desde: string; hasta: string; color: string}>({
      title: 'Ingresar separadores',
      html: `
        <div style="text-align:left">
          <label>Nombre</label>
          <input id="sp-nombre" class="swal2-input" placeholder="${defectoNombre}" value="${defectoNombre}">
          <div style="display:flex; gap:8px; align-items:center">
            <div style="flex:1">
              <label>Desde (página)</label>
              <input id="sp-desde" type="number" min="1" max="${this.totalPaginas}" class="swal2-input" value="${defectoDesde}">
            </div>
            <div style="flex:1">
              <label>Hasta (página)</label>
              <input id="sp-hasta" type="number" min="1" max="${this.totalPaginas}" class="swal2-input" value="${defectoHasta}">
            </div>
          </div>
          <label>Color</label>
          <div style="display:flex; align-items:center; gap:8px">
            <input id="sp-color" type="color" value="${defectoColor}" style="position:absolute; left:-9999px; width:0; height:0; padding:0; border:0;">
            <button id="sp-color-btn" type="button" style="height:40px; padding:0 12px; border-radius:6px; border:1px solid #ced4da; background:${defectoColor}; color:#fff; cursor:pointer;">Elegir color</button>
            <div id="sp-color-preview" style="width:36px; height:36px; border-radius:6px; border:1px solid #ced4da; background:${defectoColor}"></div>
          </div>
          <small class="text-muted">Rango inclusivo. Total de páginas: ${this.totalPaginas}.</small>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      width: '720px',
      heightAuto: true,
      customClass: { popup: 'sw-separadores' },
      didOpen: () => {
        try {
          const popupEl = Swal.getPopup();
          if (popupEl) {
            popupEl.style.minHeight = '480px';
            popupEl.style.maxWidth = '90vw';
          }
          const input = document.getElementById('sp-color') as HTMLInputElement | null;
          const prev = document.getElementById('sp-color-preview') as HTMLDivElement | null;
          const btn = document.getElementById('sp-color-btn') as HTMLButtonElement | null;
          const applyColor = (hex: string) => {
            if (prev) prev.style.background = hex;
            if (btn) {
              btn.style.background = hex;
              // Ajustar color de texto según luminancia
              const toRGB = (h: string) => {
                if (/^#([0-9a-f]{3})$/i.test(h)) {
                  const m = h.substring(1);
                  return [
                    parseInt(m[0] + m[0], 16),
                    parseInt(m[1] + m[1], 16),
                    parseInt(m[2] + m[2], 16)
                  ];
                }
                const m = h.substring(1);
                return [
                  parseInt(m.substring(0,2),16),
                  parseInt(m.substring(2,4),16),
                  parseInt(m.substring(4,6),16)
                ];
              };
              try {
                const [r,g,b] = toRGB(hex);
                const l = 0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255);
                btn.style.color = l > 0.6 ? '#000' : '#fff';
              } catch { btn.style.color = '#fff'; }
            }
          };
          if (input) {
            input.addEventListener('input', () => applyColor(input.value || '#1976d2'));
          }
          if (btn && input) {
            btn.addEventListener('click', () => input.click());
          }
          applyColor(input?.value || '#1976d2');
        } catch {}
      },
      preConfirm: () => {
        const nombre = (document.getElementById('sp-nombre') as HTMLInputElement)?.value?.trim() || defectoNombre;
        const desdeStr = (document.getElementById('sp-desde') as HTMLInputElement)?.value || `${defectoDesde}`;
        const hastaStr = (document.getElementById('sp-hasta') as HTMLInputElement)?.value || `${defectoHasta}`;
        const color = (document.getElementById('sp-color') as HTMLInputElement)?.value || defectoColor;
        const desde = Math.max(1, Math.min(this.totalPaginas, Number(desdeStr)));
        const hasta = Math.max(1, Math.min(this.totalPaginas, Number(hastaStr)));
        if (!Number.isFinite(desde) || !Number.isFinite(hasta)) {
          Swal.showValidationMessage('Debe ingresar números válidos');
          return null as any;
        }
        if (hasta < desde) {
          Swal.showValidationMessage('"Hasta" no puede ser menor que "Desde"');
          return null as any;
        }
        // Validar que el rango no se solape con separadores existentes
        const solape = this.separadores.find(s => !(hasta < s.from || desde > s.to));
        if (solape) {
          Swal.showValidationMessage(`El rango ${desde}–${hasta} se solapa con "${solape.name}" (${solape.from}–${solape.to}). Modifique el rango o edite/elimine el separador existente.`);
          return null as any;
        }
        return { nombre, desde: String(desde), hasta: String(hasta), color } as any;
      }
    });

    if (!formValues) return;
    const desde = Number(formValues.desde);
    const hasta = Number(formValues.hasta);

    // Agregar separador
    this.separadores.push({ from: desde, to: hasta, name: formValues.nombre, color: formValues.color });
    // Guardar inmediatamente en backend desde este modal, como solicitado
    this.persistirSeparadores();
  }

  // Editar un separador existente por índice
  async editarSeparador(index: number) {
    const s = this.separadores[index];
    if (!s) return;
    const defectoNombre = s.name || `Separador ${index + 1}`;
    const defectoDesde = s.from;
    const defectoHasta = s.to;
    const defectoColor = s.color || '#1976d2';

    const { value: formValues } = await Swal.fire<{ nombre: string; desde: string; hasta: string; color: string}>({
      title: 'Editar separador',
      html: `
        <div style="text-align:left">
          <label>Nombre</label>
          <input id="sp-nombre" class="swal2-input" placeholder="${defectoNombre}" value="${defectoNombre}">
          <div style="display:flex; gap:8px; align-items:center">
            <div style="flex:1">
              <label>Desde (página)</label>
              <input id="sp-desde" type="number" min="1" max="${this.totalPaginas}" class="swal2-input" value="${defectoDesde}">
            </div>
            <div style="flex:1">
              <label>Hasta (página)</label>
              <input id="sp-hasta" type="number" min="1" max="${this.totalPaginas}" class="swal2-input" value="${defectoHasta}">
            </div>
          </div>
          <label>Color</label>
          <div style="display:flex; align-items:center; gap:8px">
            <input id="sp-color" type="color" value="${defectoColor}" style="position:absolute; left:-9999px; width:0; height:0; padding:0; border:0;">
            <button id="sp-color-btn" type="button" style="height:40px; padding:0 12px; border-radius:6px; border:1px solid #ced4da; background:${defectoColor}; color:#fff; cursor:pointer;">Elegir color</button>
            <div id="sp-color-preview" style="width:36px; height:36px; border-radius:6px; border:1px solid #ced4da; background:${defectoColor}"></div>
          </div>
          <small class="text-muted">Rango inclusivo. Total de páginas: ${this.totalPaginas}.</small>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      width: '720px',
      heightAuto: true,
      customClass: { popup: 'sw-separadores' },
      didOpen: () => {
        try {
          const input = document.getElementById('sp-color') as HTMLInputElement | null;
          const prev = document.getElementById('sp-color-preview') as HTMLDivElement | null;
          const btn = document.getElementById('sp-color-btn') as HTMLButtonElement | null;
          const applyColor = (hex: string) => {
            if (prev) prev.style.background = hex;
            if (btn) {
              btn.style.background = hex;
              // contraste básico
              try {
                const m = hex.substring(1);
                const r = parseInt(m.substring(0,2),16), g = parseInt(m.substring(2,4),16), b = parseInt(m.substring(4,6),16);
                const l = 0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255);
                btn.style.color = l > 0.6 ? '#000' : '#fff';
              } catch { btn.style.color = '#fff'; }
            }
          };
          if (input) input.addEventListener('input', () => applyColor(input.value || '#1976d2'));
          if (btn && input) btn.addEventListener('click', () => input.click());
        } catch {}
      },
      preConfirm: () => {
        const nombre = (document.getElementById('sp-nombre') as HTMLInputElement)?.value?.trim() || defectoNombre;
        const desdeStr = (document.getElementById('sp-desde') as HTMLInputElement)?.value || `${defectoDesde}`;
        const hastaStr = (document.getElementById('sp-hasta') as HTMLInputElement)?.value || `${defectoHasta}`;
        const color = (document.getElementById('sp-color') as HTMLInputElement)?.value || defectoColor;
        const desde = Math.max(1, Math.min(this.totalPaginas, Number(desdeStr)));
        const hasta = Math.max(1, Math.min(this.totalPaginas, Number(hastaStr)));
        if (!Number.isFinite(desde) || !Number.isFinite(hasta)) {
          Swal.showValidationMessage('Debe ingresar números válidos');
          return null as any;
        }
        if (hasta < desde) {
          Swal.showValidationMessage('"Hasta" no puede ser menor que "Desde"');
          return null as any;
        }
        // Validar solapamiento excluyendo el propio separador
        const solape = this.separadores.find((sep, idx) => idx !== index && !(hasta < sep.from || desde > sep.to));
        if (solape) {
          Swal.showValidationMessage(`El rango ${desde}–${hasta} se solapa con "${solape.name}" (${solape.from}–${solape.to}).`);
          return null as any;
        }
        return { nombre, desde: String(desde), hasta: String(hasta), color } as any;
      }
    });

    if (!formValues) return;
    // Actualizar y persistir
    this.separadores[index] = {
      from: Number(formValues.desde),
      to: Number(formValues.hasta),
      name: formValues.nombre,
      color: formValues.color
    };
    this.persistirSeparadores();
  }

  async eliminarSeparador(index: number) {
    const s = this.separadores[index];
    if (!s) return;
    const ok = await Swal.fire({
      title: 'Eliminar separador',
      html: `¿Desea eliminar "<b>${s.name}</b>" (${s.from}–${s.to})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!ok.isConfirmed) return;
    this.separadores.splice(index, 1);
    this.persistirSeparadores();
  }

  // Navegar a la primera página del separador clickeado
  irASeparador(index: number) {
    const s = this.separadores[index];
    if (!s) return;
    let destino = Math.max(1, Math.min(this.totalPaginas || 1, Number(s.from || 1)));
    Swal.fire({ title: 'Cargando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.cargarPagina(destino - 1);
  }

  // Devuelve info de separador si la página (0-based) pertenece a alguno
  separadorDePagina(page0: number): { sep: { from: number; to: number; name: string; color: string }, isFirst: boolean } | null {
    const page1 = page0 + 1;
    for (const s of this.separadores) {
      if (page1 >= s.from && page1 <= s.to) {
        return { sep: s, isFirst: page1 === s.from };
      }
    }
    return null;
  }

  // Genera array de páginas 1-based para mostrar cards
  pagesFor(s: { from: number; to: number }): number[] {
    const out: number[] = [];
    for (let i = s.from; i <= s.to; i++) out.push(i);
    return out;
  }

  // Utilidad: color de texto legible según fondo del tab
  textColorFor(bg: string): '#000' | '#fff' {
    // Espera colores tipo #rrggbb o #rgb; fallback negro
    try {
      let r = 0, g = 0, b = 0;
      if (/^#([0-9a-f]{3})$/i.test(bg)) {
        const m = bg.substring(1);
        r = parseInt(m[0] + m[0], 16);
        g = parseInt(m[1] + m[1], 16);
        b = parseInt(m[2] + m[2], 16);
      } else if (/^#([0-9a-f]{6})$/i.test(bg)) {
        const m = bg.substring(1);
        r = parseInt(m.substring(0, 2), 16);
        g = parseInt(m.substring(2, 4), 16);
        b = parseInt(m.substring(4, 6), 16);
      } else {
        return '#000';
      }
      // luminancia relativa aproximada
      const l = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
      return l > 0.6 ? '#000' : '#fff';
    } catch {
      return '#000';
    }
  }

  // Ir a página específica (1-based en la UI)
  irAPagina() {
    if (this.jumpPage === null || isNaN(this.jumpPage as any)) return;
    let destino = Math.floor(Number(this.jumpPage));
    if (destino < 1) destino = 1;
    if (destino > this.totalPaginas) destino = this.totalPaginas;
    this.avisoCargandoPagina();
    this.cargarPagina(destino - 1); // convertir a 0-based
  }

  // Controles de zoom
  zoomMas() {
    this.zoomScale = Math.min(this.maxZoom, +(this.zoomScale + this.zoomStep).toFixed(2));
    // Re-render de parches visuales según nuevo zoom (basado en layout)
    requestAnimationFrame(() => this.renderParches());
    // Auditoría deshabilitada
    this._addAccion('ZOOM');
  }

  zoomMenos() {
    this.zoomScale = Math.max(this.minZoom, +(this.zoomScale - this.zoomStep).toFixed(2));
    requestAnimationFrame(() => this.renderParches());
    // Auditoría deshabilitada
    this._addAccion('ZOOM');
  }

  resetZoom() {
    this.zoomScale = this.zoomInicial ?? 1;
    requestAnimationFrame(() => this.renderParches());
    // Auditoría deshabilitada
    this._addAccion('ZOOM');
  }

  // Captura dimensiones naturales de la imagen cuando carga para habilitar zoom por tamaño real
  onImgLoad(ev: Event) {
    const img = ev.target as HTMLImageElement;
    if (!img) return;
    // Usar naturalWidth/Height si están disponibles
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w && h) {
      this.baseImgWidth = w;
      this.baseImgHeight = h;
      // Forzar un render de parches acorde al nuevo layout
      requestAnimationFrame(() => this.renderParches());
    }
  }

  // Eventos de arrastre para mover el documento cuando hay zoom
  onPanStart(event: MouseEvent, container: HTMLElement) {
    if (this.zoomScale <= 1) return; // solo permitir pan si hay zoom
    this.isPanning = true;
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    this.panScrollLeft = container.scrollLeft;
    this.panScrollTop = container.scrollTop;
    event.preventDefault();
  }

  onPanMove(event: MouseEvent, container: HTMLElement) {
    if (!this.isPanning) return;
    const dx = event.clientX - this.panStartX;
    const dy = event.clientY - this.panStartY;
    container.scrollLeft = this.panScrollLeft - dx;
    container.scrollTop = this.panScrollTop - dy;
  }

  onPanEnd() {
    this.isPanning = false;
  }

  // --- LIMPIAR (recorte) ---
  toggleRecorte() {
    this.recorteActivo = !this.recorteActivo;
    // Al activar recorte, desactiva pan mientras se dibuja
    if (this.recorteActivo) {
      this.isPanning = false;
      // Mostrar parches existentes (si hay)
      requestAnimationFrame(() => this.renderParches());
      // Auditoría: activar limpieza
      this._addAccion('LIMPIEZA');
    } else {
      this.isDrawing = false;
      this.clearSeleccion();
      // Ocultar parches temporales
      this.clearParches();
    }
  }

  get haySeleccion(): boolean {
    return Math.abs(this.endDrawX - this.startDrawX) > 2 && Math.abs(this.endDrawY - this.startDrawY) > 2;
  }

  onRecorteStart(ev: MouseEvent) {
    if (!this.recorteActivo) return;
    const img = this.imgDocRef?.nativeElement;
    const escenario = this.escenarioRef?.nativeElement;
    if (!img || !escenario) return;

    const imgRect = img.getBoundingClientRect();
    const escRect = escenario.getBoundingClientRect();
    // Coordenadas relativas al borde superior-izquierdo de la imagen ya transformada
    const x = Math.max(0, Math.min(imgRect.width, ev.clientX - imgRect.left));
    const y = Math.max(0, Math.min(imgRect.height, ev.clientY - imgRect.top));

    this.startDrawX = x;
    this.startDrawY = y;
    this.endDrawX = x;
    this.endDrawY = y;
    this.isDrawing = true;

    // Posicionar el rectángulo inicial
    this.updateRectStyle(imgRect, escRect);
    ev.preventDefault();
  }

  onRecorteMove(ev: MouseEvent) {
    if (!this.recorteActivo || !this.isDrawing) return;
    const img = this.imgDocRef?.nativeElement;
    const escenario = this.escenarioRef?.nativeElement;
    if (!img || !escenario) return;
    const imgRect = img.getBoundingClientRect();
    const escRect = escenario.getBoundingClientRect();
    const x = Math.max(0, Math.min(imgRect.width, ev.clientX - imgRect.left));
    const y = Math.max(0, Math.min(imgRect.height, ev.clientY - imgRect.top));
    this.endDrawX = x;
    this.endDrawY = y;
    this.updateRectStyle(imgRect, escRect);
  }

  onRecorteEnd() {
    if (!this.recorteActivo) return;
    this.isDrawing = false;
    // Al soltar, guardar la selección actual en coordenadas reales (píxeles naturales)
    const img = this.imgDocRef?.nativeElement;
    if (!img) { this.clearSeleccion(); return; }
    const imgRect = img.getBoundingClientRect();
    const escalaX = img.naturalWidth / imgRect.width;
    const escalaY = img.naturalHeight / imgRect.height;

    const sxVis = Math.min(this.startDrawX, this.endDrawX);
    const syVis = Math.min(this.startDrawY, this.endDrawY);
    const swVis = Math.abs(this.endDrawX - this.startDrawX);
    const shVis = Math.abs(this.endDrawY - this.startDrawY);

    if (swVis > 2 && shVis > 2) {
      const sel = {
        x: Math.max(0, Math.round(sxVis * escalaX)),
        y: Math.max(0, Math.round(syVis * escalaY)),
        w: Math.max(1, Math.round(swVis * escalaX)),
        h: Math.max(1, Math.round(shVis * escalaY))
      };
      // Aplicar inmediatamente solo esta selección y mantener el modo limpieza activo
      this.aplicarLimpiezaConSeleccion(sel);
    }
    // Limpiar rectángulo visual temporal
    this.clearSeleccion();
    // No se usan overlays de parches en modo continuo
  }

  // Posiciona el rectángulo de selección en el escenario
  updateRectStyle(imgRect: DOMRect, escRect: DOMRect) {
    const leftInImg = Math.min(this.startDrawX, this.endDrawX);
    const topInImg = Math.min(this.startDrawY, this.endDrawY);
    const widthInImg = Math.abs(this.endDrawX - this.startDrawX);
    const heightInImg = Math.abs(this.endDrawY - this.startDrawY);

    // Offset de la imagen respecto al escenario (considerando centrado horizontal y top-align)
    const offsetLeft = imgRect.left - escRect.left;
    const offsetTop = imgRect.top - escRect.top;

    const rect = this.escenarioRef.nativeElement.querySelector('.selection-rect') as HTMLDivElement | null;
    if (rect) {
      rect.style.left = `${offsetLeft + leftInImg}px`;
      rect.style.top = `${offsetTop + topInImg}px`;
      rect.style.width = `${widthInImg}px`;
      rect.style.height = `${heightInImg}px`;
      rect.style.display = widthInImg > 2 && heightInImg > 2 ? 'block' : 'none';
    }
  }

  clearSeleccion() {
    const rect = this.escenarioRef?.nativeElement.querySelector('.selection-rect') as HTMLDivElement | null;
    if (rect) rect.style.display = 'none';
    this.startDrawX = this.startDrawY = this.endDrawX = this.endDrawY = 0;
  }

  aplicarLimpieza() {
    if (!this.paginaMostrada || this.selecciones.length === 0) return;
    const src = this.paginaMostrada;
    const baseImg = new Image();
    baseImg.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = baseImg.naturalWidth || baseImg.width;
        canvas.height = baseImg.naturalHeight || baseImg.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // 1) Dibuja la imagen original
        ctx.drawImage(baseImg, 0, 0);
        // 2) Pinta en blanco cada selección acumulada
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        for (const r of this.selecciones) {
          // Clamp dentro del lienzo por seguridad
          const x = Math.max(0, Math.min(canvas.width, r.x));
          const y = Math.max(0, Math.min(canvas.height, r.y));
          const w = Math.max(1, Math.min(canvas.width - x, r.w));
          const h = Math.max(1, Math.min(canvas.height - y, r.h));
          ctx.fillRect(x, y, w, h);
        }
        ctx.restore();
        // 3) Reemplaza la imagen en pantalla
        this.paginaMostrada = canvas.toDataURL('image/png');
        // Registrar esta página como editada
        this.paginasEditadas[this.paginaActual] = this.paginaMostrada;
        // Limpia estado
        this.selecciones = [];
        this.clearSeleccion();
        this.clearParches();
        // Mantener el modo limpieza activo para limpieza continua
      } catch {
        Swal.fire('Error', 'No se pudo aplicar la limpieza.', 'error');
      }
    };
    baseImg.onerror = () => Swal.fire('Error', 'No se pudo cargar la imagen base.', 'error');
    baseImg.src = src;
  }

  limpiarSelecciones() {
    this.selecciones = [];
    this.clearSeleccion();
    this.clearParches();
  }

  // Aplica una sola selección directamente sobre la imagen base y actualiza la vista
  private aplicarLimpiezaConSeleccion(sel: { x: number; y: number; w: number; h: number }) {
    if (!this.paginaMostrada) return;
    const src = this.paginaMostrada;
    this.pushHistory(src);
    const baseImg = new Image();
    baseImg.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = baseImg.naturalWidth || baseImg.width;
        canvas.height = baseImg.naturalHeight || baseImg.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(baseImg, 0, 0);
        ctx.fillStyle = '#FFFFFF';
        // Clamp por seguridad
        const x = Math.max(0, Math.min(canvas.width, sel.x));
        const y = Math.max(0, Math.min(canvas.height, sel.y));
        const w = Math.max(1, Math.min(canvas.width - x, sel.w));
        const h = Math.max(1, Math.min(canvas.height - y, sel.h));
        ctx.fillRect(x, y, w, h);
        this.paginaMostrada = canvas.toDataURL('image/png');
        // Registrar esta página como editada (para guardar como nueva versión)
        this.paginasEditadas[this.paginaActual] = this.paginaMostrada;
        // No alteramos recorteActivo; limpieza continua
        requestAnimationFrame(() => this.renderParches());
        // Auditoría deshabilitada
      } catch {
        Swal.fire('Error', 'No se pudo limpiar la zona seleccionada.', 'error');
      }
    };
    baseImg.onerror = () => Swal.fire('Error', 'No se pudo cargar la imagen base.', 'error');
    baseImg.src = src;
  }

  private pushHistory(state: string) {
    try {
      this.history.push(state);
      if (this.history.length > this.maxHistory) {
        this.history.splice(0, this.history.length - this.maxHistory);
      }
    } catch {}
  }

  retroceder() {
    if (this.history.length === 0) return;
    const prev = this.history.pop()!;
    this.paginaMostrada = prev;
    // Sincronizar el mapa de editadas: si ya no queda historial, la página
    // volvió a su estado original -> quitarla de editadas.
    if (this.history.length === 0) {
      delete this.paginasEditadas[this.paginaActual];
    } else {
      this.paginasEditadas[this.paginaActual] = prev;
    }
    // Al retroceder, limpiar selecciones temporales y parches
    this.selecciones = [];
    this.clearSeleccion();
    this.clearParches();
    requestAnimationFrame(() => this.renderParches());
  }

  // Guarda la limpieza como una NUEVA VERSIÓN del documento
  async guardarCambios() {
    const indices = Object.keys(this.paginasEditadas).map(k => Number(k));
    if (indices.length === 0) {
      Swal.fire('Sin cambios', 'No se han realizado modificaciones para guardar.', 'info');
      return;
    }

    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Guardar como nueva versión',
      html: `Se modificaron <b>${indices.length}</b> página(s). Se guardará como una <b>nueva versión</b> del documento. ¿Continuar?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6'
    });
    if (!confirm.isConfirmed) { return; }

    const paginas = indices.map(idx => ({ pagina: idx, imagen: this.paginasEditadas[idx] }));
    let usuario_id: number | null = null;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      usuario_id = user?.id ? Number(user.id) : null;
    } catch {}

    Swal.fire({
      title: 'Guardando nueva versión...',
      text: 'Reconstruyendo el documento, espere por favor.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.indexacionService.guardarNuevaVersionDocumento({
      id_documento: this.idDocumento,
      paginas,
      usuario_id
    }).subscribe({
      next: (resp: any) => {
        Swal.close();
        if (resp?.success) {
          Swal.fire({
            icon: 'success',
            title: 'Nueva versión guardada',
            text: resp?.message || 'Se guardó una nueva versión del documento.',
            confirmButtonColor: '#28a745'
          }).then(() => {
            // Cerrar el visor indicando que hubo una nueva versión (para refrescar)
            this.activeModal.close({ accion: 'nueva_version' });
          });
        } else {
          Swal.fire('Aviso', resp?.message || 'No se pudo guardar la nueva versión.', 'info');
        }
      },
      error: (err: any) => {
        Swal.close();
        console.error('Error guardando nueva versión:', err);
        Swal.fire('Error', err?.error?.message || 'No se pudo guardar la nueva versión.', 'error');
      }
    });
  }

  // Persistencia de separadores desde el flujo del modal "Ingresar separadores"
  private persistirSeparadores() {
    this._addAccion('SEPARADORES'); 
    try {
      const payload = {
        id_documento: this.idDocumento,
        id_empresa: this.idEmpresa ?? null,
        id_serie_subserie: this.idSerieSubserie ?? null,
        separadores: this.separadores.map(s => ({
          nombre: s.name,
          pagina_inicio: s.from,
          pagina_fin: s.to,
          color: s.color || null
        }))
      };
      Swal.fire({ title: 'Guardando separadores...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      this.indexacionService.guardarSeparadoresDocumento(payload).subscribe({
        next: () => {
          Swal.close();
          Swal.fire({ icon: 'success', title: 'Separadores guardados', timer: 1200, showConfirmButton: false });
        },
        error: () => {
          Swal.close();
          Swal.fire('Error', 'No se pudieron guardar los separadores. Inténtalo nuevamente.', 'error');
        }
      });
    } catch {
      Swal.fire('Error', 'Ocurrió un problema al preparar el guardado de separadores.', 'error');
    }
  }

  // Dibuja parches blancos visuales sobre las selecciones acumuladas (sin modificar la imagen aún)
  renderParches() {
    const img = this.imgDocRef?.nativeElement;
    const escenario = this.escenarioRef?.nativeElement;
    if (!img || !escenario) return;
    // Asegurar contenedor de parches
    let layer = escenario.querySelector('.patches') as HTMLDivElement | null;
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'patches';
      escenario.appendChild(layer);
    }
    // Limpiar anteriores
    layer.innerHTML = '';
    if (this.selecciones.length === 0) return;

    const imgRect = img.getBoundingClientRect();
    const escRect = escenario.getBoundingClientRect();
    const offsetLeft = imgRect.left - escRect.left;
    const offsetTop = imgRect.top - escRect.top;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (!natW || !natH) return;

    for (const r of this.selecciones) {
      const xVis = (r.x / natW) * imgRect.width;
      const yVis = (r.y / natH) * imgRect.height;
      const wVis = (r.w / natW) * imgRect.width;
      const hVis = (r.h / natH) * imgRect.height;

      const d = document.createElement('div');
      d.className = 'patch';
      d.style.left = `${offsetLeft + xVis}px`;
      d.style.top = `${offsetTop + yVis}px`;
      d.style.width = `${wVis}px`;
      d.style.height = `${hVis}px`;
      layer.appendChild(d);
    }
  }

  clearParches() {
    const escenario = this.escenarioRef?.nativeElement;
    const layer = escenario?.querySelector('.patches') as HTMLDivElement | null;
    if (layer) layer.innerHTML = '';
  }

  // Imprimir solo la página actualmente visible
  imprimirPaginaActual() {
    
    if (!this.paginaMostrada) return;
    try {
      // Crear un iframe oculto y cargar un documento mínimo que imprime al cargar la imagen
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';

      const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Imprimir Página</title>
          <style>
            html, body { margin: 0; padding: 0; }
            img { max-width: 100%; width: 100%; height: auto; display: block; }
            @page { size: auto; margin: 12mm; }
          </style>
        </head>
        <body>
          <img src="${this.paginaMostrada}" alt="Página a imprimir" onload="setTimeout(function(){ try{ window.focus(); window.print(); }catch(e){} }, 0)" />
          <script>
            window.addEventListener('afterprint', function(){ try { window.close && window.close(); } catch(e){} });
          <\/script>
        </body>
      </html>`;

      document.body.appendChild(iframe);
      // Usar srcdoc para evitar tiempos de espera adicionales
      (iframe as any).srcdoc = html;

      // Limpieza posterior: quitar el iframe después de imprimir o tras un timeout de seguridad
      const cleanup = () => {
        try { iframe.parentNode && iframe.parentNode.removeChild(iframe); } catch {}
      };
      // Si el navegador no dispara afterprint dentro del documento embebido, remueve en 30s
      setTimeout(cleanup, 30000);

      // También intentar enganchar el afterprint del iframe
      try {
        iframe.onload = () => {
          try {
            iframe.contentWindow?.addEventListener('afterprint', cleanup);
          } catch {}
        };
      } catch {}
    } catch (e) {
      Swal.fire('Error', 'Ocurrió un problema al preparar la impresión de la página actual.', 'error');
    }
    // Auditoría deshabilitada
    this._addAccion('IMPRESION');
   this._paginasImpresas.push(this.paginaActual + 1);
  }

  // Descarga secuencialmente todas las páginas en base64 y lanza el diálogo de impresión del navegador
  async imprimirDocumentoCompleto() {
    if (!this.paginaMostrada || this.totalPaginas <= 0) {
      return;
    }

    // Abre el popup de inmediato para evitar bloqueo por el navegador
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) {
      Swal.fire('Aviso', 'No se pudo abrir la ventana de impresión. Verifica el bloqueador de ventanas emergentes.', 'info');
      return;
    }

    // Escribe un contenido mínimo con indicador de progreso
    popup.document.open();
    popup.document.write(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Preparando PDF…</title>
        <style>
          html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          #progreso { padding: 16px; color: #333; }
          #frame { width: 100vw; height: 100vh; border: 0; display: none; }
        </style>
      </head>
      <body>
        <div id="progreso">Preparando PDF… 0 / ${this.totalPaginas}</div>
        <div id="root">Se generará un PDF con todas las páginas…</div>
        <iframe id="frame"></iframe>
      </body>
    </html>`);
    popup.document.close();

    // Loader también en la UI principal
    Swal.fire({
      title: 'Preparando PDF...',
      html: 'Cargando 1 / ' + this.totalPaginas,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const imagenes: string[] = [];

      const fetchPagina = (index: number) => new Promise<string>((resolve, reject) => {
        const payload = {
          idDocumento: this.idDocumento,
          idEmpresa: this.idEmpresa,
          idSerieSubserie: this.idSerieSubserie || null,
          page: index
        } as any;
        this.indexacionService.obtenerDocumentoUrl(payload).subscribe({
          next: (resp: any) => {
            if (resp?.success && resp.data?.imagen) {
              resolve(resp.data.imagen as string);
            } else {
              reject(new Error('Respuesta inválida al cargar página ' + (index + 1)));
            }
          },
          error: (err: any) => reject(err)
        });
      });

      for (let i = 0; i < this.totalPaginas; i++) {
        const container = Swal.getHtmlContainer();
        if (container) container.textContent = `Cargando ${i + 1} / ${this.totalPaginas}`;
        // Actualiza progreso dentro del popup
        try {
          const progEl = popup.document.getElementById('progreso');
          if (progEl) progEl.textContent = `Preparando PDF… ${i + 1} / ${this.totalPaginas}`;
        } catch {}
        const img = await fetchPagina(i);
        imagenes.push(img);
      }

      Swal.close();

      // Cargar jsPDF en el popup y generar un único PDF con todas las páginas
      const script = popup.document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      script.onload = async () => {
        try {
          const { jsPDF } = (popup as any).jspdf;
          const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 24;
          let first = true;

          // Helper para obtener dimensiones reales de cada imagen
          const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
            // Usar constructor global Image del contexto actual para evitar problemas de tipado
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = reject;
            im.src = src;
          });

          for (let idx = 0; idx < imagenes.length; idx++) {
            const src = imagenes[idx];
            const imgEl = await loadImage(src);
            const imgW = imgEl.naturalWidth || imgEl.width;
            const imgH = imgEl.naturalHeight || imgEl.height;
            const maxW = pageWidth - margin * 2;
            const maxH = pageHeight - margin * 2;
            const ratio = Math.min(maxW / imgW, maxH / imgH);
            const drawW = imgW * ratio;
            const drawH = imgH * ratio;
            const x = (pageWidth - drawW) / 2;
            const y = (pageHeight - drawH) / 2;
            const imgType = src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';

            if (!first) doc.addPage();
            first = false;
            doc.addImage(src, imgType as any, x, y, drawW, drawH);
          }

          const blob = doc.output('blob');
          const url = URL.createObjectURL(blob);
          // Cargar el PDF en el iframe dentro del mismo popup y lanzar print
          try {
            const iframe = popup.document.getElementById('frame') as HTMLIFrameElement | null;
            const progreso = popup.document.getElementById('progreso');
            if (progreso) progreso.textContent = 'Abriendo visor de impresión…';
            if (iframe) {
              iframe.style.display = 'block';
              iframe.onload = () => {
                try {
                  iframe.contentWindow?.focus();
                  iframe.contentWindow?.print();
                } catch {}
              };
              iframe.src = url;
            } else {
              // Fallback: navegar dentro del popup
              popup.location.href = url;
            }
          } catch {
            popup.location.href = url;
          }
        } catch (err) {
          console.error(err);
          try {
            popup.document.open();
            popup.document.write('<p style="padding:16px;font-family:Arial">No se pudo generar el PDF.</p>');
            popup.document.close();
          } catch {}
        }
      };
      script.onerror = () => {
        try {
          popup.document.body.innerHTML = '<p style="padding:16px;font-family:Arial">No se pudo cargar jsPDF para generar el PDF.</p>';
        } catch {}
      };
      try { popup.document.head.appendChild(script); } catch {}

    } catch (e) {
      Swal.close();
      try { popup.close(); } catch {}
      Swal.fire('Error', 'No se pudo preparar la impresión del documento completo.', 'error');
    }

    // dentro del script.onload, después de generar el blob exitosamente
    this._addAccion('IMPRESION_COMPLETA');
    this._imprimioCompleto = true;
    this._paginasImpresas.push(...Array.from({length: this.totalPaginas}, (_, i) => i + 1));
  }
}
