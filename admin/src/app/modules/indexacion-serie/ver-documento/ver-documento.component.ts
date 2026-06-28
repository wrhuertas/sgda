import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { URL_SERVICIOS } from 'src/app/config/config';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { IndexacionSerieService } from '../service/indexacion-serie.service';

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

  // Estado del visor
  paginaMostrada: string | null = null; // base64 devuelta por el backend
  paginaActual = 0; // 0-based
  totalPaginas = 0;
  // Input para salto de página (1-based en UI)
  jumpPage: number | null = null;

  private _paginasImpresas: number[] = [];

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

        // 👇 Detalle legible de páginas impresas (sin límite de longitud)
        const paginasUnicas = Array.from(new Set(this._paginasImpresas)).sort((a, b) => a - b);
        const detalleEventos = paginasUnicas.length
          ? `Páginas impresas: ${paginasUnicas.join(', ')}`
          : null;

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

  private cargarPagina(index: number) {
    try { console.log('[VerDocumento] solicitando página (0-based):', index); } catch {}
    this.paginaMostrada = '';
    // Al cambiar de página, resetear el zoom para evitar desorientar al usuario
    this.zoomScale = 1;
    // Reiniciar dimensiones base (se establecerán al cargar la nueva imagen)
    this.baseImgWidth = 0;
    this.baseImgHeight = 0;
    // Limpiar historial y selecciones al cargar nueva página
    this.history = [];
    this.selecciones = [];
    this.clearParches();
    // Optimista: ajustar estado local para que los botones se comporten bien aunque el backend reporte 0
    this.paginaActual = index;
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
          // Reflejar la página actual (1-based) en el input "Ir a"
          this.jumpPage = this.paginaActual + 1;
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

  paginaAnterior() {
    if (this.paginaActual > 0) {
      Swal.fire({ title: 'Cargando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      this.cargarPagina(this.paginaActual - 1);
    }
  }

  siguientePagina() {
    if (this.paginaActual < this.totalPaginas - 1) {
      Swal.fire({ title: 'Cargando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      this.cargarPagina(this.paginaActual + 1);
    }
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
    Swal.fire({ title: 'Cargando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
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
    this.zoomScale = 1;
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
    // Al retroceder, limpiar selecciones temporales y parches
    this.selecciones = [];
    this.clearSeleccion();
    this.clearParches();
    requestAnimationFrame(() => this.renderParches());
  }

  // Cierra el modal devolviendo la imagen actual de la página y metadatos
  guardarCambios() {
    if (!this.paginaMostrada) {
      this.activeModal.dismiss('no_changes');
      return;
    }
    this.activeModal.close({
      accion: 'guardar_cambios',
      idDocumento: this.idDocumento,
      idEmpresa: this.idEmpresa,
      idSerieSubserie: this.idSerieSubserie ?? null,
      paginaActual: this.paginaActual, // 0-based
      imagenBase64: this.paginaMostrada,
      separadores: this.separadores
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
    this._paginasImpresas.push(...Array.from({length: this.totalPaginas}, (_, i) => i + 1));
  }
}
