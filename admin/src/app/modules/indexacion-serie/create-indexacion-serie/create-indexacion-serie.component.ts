import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, QueryList, Renderer2, ViewChild, ViewChildren } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { createWorker } from 'tesseract.js';
import { IndexacionSerieService } from '../service/indexacion-serie.service';

import { IndexarDocumentoComponent } from '../indexar-documento/indexar-documento.component'; // ruta según tu proyecto
import { HttpEventType } from '@angular/common/http';


import * as pdfjsLib from 'pdfjs-dist';
import { pdfjsWorker } from 'pdfjs-dist/build/pdf.worker.entry';
import { URL_BACKEND } from 'src/app/config/config';
import { IngresarInformacionComponent } from '../ingresar-informacion/ingresar-informacion.component';
import { SubirAnexosComponent } from '../subir-anexos/subir-anexos.component';
import { SubirExcelMasivoComponent } from '../subir-excel-masivo/subir-excel-masivo.component';
import { HacerOcrComponent } from '../hacer-ocr/hacer-ocr.component';
import { HacerOcrIAComponent } from '../hacer-ocr-ia/hacer-ocr-ia.component';
import { ControlCalidadComponent } from '../control-calidad/control-calidad.component';
import { MoverDocumentoComponent } from '../mover-documento/mover-documento.component';
import { DocumentoVersionComponent } from '../documento-version/documento-version.component';
import { DocumentoViewerService } from '../ver-documento/documento-viewer.service';
import { AuthService } from '../../auth';
// Configurar el worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;


@Component({
  selector: 'app-create-indexacion-serie',
  templateUrl: './create-indexacion-serie.component.html',
  styleUrls: ['./create-indexacion-serie.component.scss']
})
export class CreateIndexacionSerieComponent {

  @ViewChild('fileInputExcel') fileInputExcel!: ElementRef<HTMLInputElement>;
  @ViewChild('textLayer', { static: false })
  textLayer!: ElementRef<HTMLDivElement>;

  @ViewChild('pdfCanvasTemp') pdfCanvasTemp!: ElementRef<HTMLCanvasElement>;
  @ViewChildren('pdfCanvasTemp') pdfCanvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;

  @Input() idModulo!: number;
   @Input() idIndexacion!: number | null;
  campos: any[] = [];
  archivosSeleccionados: File[] = [];
  @Output() IndexacionC: EventEmitter<any> = new EventEmitter();

  @ViewChild('pdfCanvas') pdfCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contextMenu') contextMenu!: ElementRef<HTMLDivElement>;

  @Input() nombreProyecto!: string;
  @Input() idProyecto!: string;
  @Input() idSerie!: number;
  @Input() idLugarRuta?: number | null;
  @Input() idEdificio?: number | null;
  @Input() idSala?: number | null;
  idSeriePadre: number | null = null;
idSubSerie: number | null = null;

  @Input() serieBackend: any;

 @Input() camposExtraTitulos: string[] = [];
 @Input() camposExtraValores: string[] = [];

   imagenesPDF: string[] = [];
  
  inputSeleccionadoIndex: number | null = null;
  showMenu: boolean = false;
  menuX: number = 0;
  menuY: number = 0;
  textoSeleccionado: string = '';

  archivosProcesados: any[] = [];
  urlsSanitizadas: string[] = [];
  indiceActual: number = 0;

  archivoSeleccionadoTemp: File | null = null;
  pdfDocTemp: any = null;
  pageNumTemp: number = 1;
  pageCountTemp: number = 0;


recorteActivo: boolean = false;

zoomActivo: boolean = false; // 🔹 controla si el zoom está activo


zoomFactor: number = 1;
offsetX: number = 0;
offsetY: number = 0;
currentX: number = 0;
currentY: number = 0;
isDragging: boolean = false;
dragPageIndex: number | null = null;
startX: number = 0;
startY: number = 0;

maxWidth: number = 800; // ancho máximo del contenedor
maxHeight: number = 1000; // altura máxima del contenedor



  // PDF.js variables
  pdfDoc: any = null;
  pageNum: number = 1;
  pageCount: number = 0;
  scale: number = 1.5;
  ctx!: CanvasRenderingContext2D;

 // imagenesPDF: string[] = []; // las imágenes en base64 que generas del PDF
  selectedArea: { x: number; y: number; width: number; height: number } | null =
    null;
  isDrawing = false;
  selectedPage: number | null = null;
  recorte: string | null = null; // aquí guardamos la imagen recortada


  
textoOCR: string = '';
 usuario_id!: number;
  id_empresa!: number;






// Propiedades nuevas que resuelven el error:
  public nombreDocumento: string = '';
  public fechaDocumento: string = ''; // O Date, dependiendo de cómo manejes las fechas




  // FECHAS EXTREMAS
    fechaApertura: string = '';
    fechaCierre: string = '';
    
    // NÚMEROS DE FOLIOS/PÁGINAS
    nroFolios: number | null = null;
    folioSecuencialInicio: number | null = null;
    folioSecuencialFin: number | null = null;
    nroPaginasDigitales: number | null = null;
    
    // DESTINO FINAL
    destinoFinal: string = '';
    
    // UBICACIÓN TOPOGRÁFICA
    nroCaja: number | null = null;
    nroCarpetaFisica: number | null = null;
    nroTomo: number | null = null;
    nroEstanteria: string | null = null;
    nroBandeja: string | null = null;

    // VARIABLES ADICIONALES (De la imagen 2)
tipoSoporte: string = 'PAPEL';
tipoAcceso: string = 'PUBLICA';
estadoConservacion: string = 'BUENO';
observaciones: string = '';





// Plazos de Conservación (Retención)
plazoGestion: number | null = null;
plazoCentral: number | null = null;
plazoIntermedio: string = '';
plazoHistorico: string = '';


// Base Legal
baseLegal: string = '';

// Disposición y Técnica
disposicionFinal: string = 'CONSERVACION'; // O 'ELIMINACION'
tecnicaSeleccion: string = 'COMPLETA'; // O 'PARCIAL', 'N/A'


    observacionesRespuesta: string = '';
    revisadoDigitadoPor: string = '';

  documentos: any[] = [];
  // Búsqueda dentro de la tabla de documentos (filtra los ya cargados)
  busquedaDocumento: string = '';

  cargandoDocumentos: boolean = false;

  // Lista de documentos seleccionados (checkbox)
  documentosSeleccionados: any[] = [];
  selectAllDocs: boolean = false;


  puedeFirmarExpediente: boolean = true;

  // Tipo de documento a enviar en subida (DIGITAL / ELECTRONICO)
  private tipoDocSeleccionado: string | null = null;
  // Marcado en el modal de formato: guarda la ruta cifrada en la base de datos
  private encriptarRuta = false;
  // Marcado en el modal de formato: renombra el PDF con los datos de la persona
  private renombrarPorContenido = false;
  // Con qué dato se arma ese nombre: 'nombre' | 'cedula' | 'ambos'
  private modoRenombrado = 'nombre';
  // Solo la Armada del Ecuador ve esa casilla (hojas de vida)
  private esArmadaDelEcuador = false;

  // Hover preview de la primera página del PDF
  previewImage: string | null = null; // data URL
  previewVisible = false;
  previewX = 0;
  previewY = 0;
  private previewCache: { [docId: number]: string } = {};
  private previewEl: HTMLDivElement | null = null;
  private previewImgEl: HTMLImageElement | null = null;
  private previewPlaceholderEl: HTMLDivElement | null = null;
  private previewSub: Subscription | null = null;

  // Navegador de ruta jerárquica (expansiones)
  expandKeys: { [key: string]: boolean } = {};
  toggle(key: string) { this.expandKeys[key] = !this.expandKeys[key]; }

  // Ruta seleccionada (ids y nombres)
  selectedRuta: {
    edificio?: { id: number; nombre: string } | null;
    sala?: { id: number; nombre: string } | null;
    estanteria?: { id: number; nombre: string } | null;
    fila?: { id: number; nombre: string } | null;
    caja?: { id: number; nombre: string } | null;
    carpeta?: { id: number; nombre: string } | null;
  } = {} as any;

  // Display compacto de la ruta seleccionada
  get rutaDisplay(): string {
    const parts: string[] = [];
    if (this.selectedRuta?.edificio) parts.push(`Edificio [${this.selectedRuta.edificio.id}]: ${this.selectedRuta.edificio.nombre}`);
    if (this.selectedRuta?.sala) parts.push(`Sala [${this.selectedRuta.sala.id}]: ${this.selectedRuta.sala.nombre}`);
    if (this.selectedRuta?.estanteria) parts.push(`Estantería [${this.selectedRuta.estanteria.id}]: ${this.selectedRuta.estanteria.nombre}`);
    if (this.selectedRuta?.fila) parts.push(`Fila [${this.selectedRuta.fila.id}]: ${this.selectedRuta.fila.nombre}`);
    if (this.selectedRuta?.caja) parts.push(`Caja [${this.selectedRuta.caja.id}]: ${this.selectedRuta.caja.nombre}`);
    if (this.selectedRuta?.carpeta) parts.push(`Carpeta [${this.selectedRuta.carpeta.id}]: ${this.selectedRuta.carpeta.nombre}`);
    return parts.join(' • ');
  }

  // Partes de la ruta para renderizar con separador ">" y resaltar el nivel actual
  get rutaDisplayParts(): string[] {
    const parts: string[] = [];
    if (this.selectedRuta?.edificio) parts.push(`Edificio [${this.selectedRuta.edificio.id}]: ${this.selectedRuta.edificio.nombre}`);
    if (this.selectedRuta?.sala) parts.push(`Sala [${this.selectedRuta.sala.id}]: ${this.selectedRuta.sala.nombre}`);
    if (this.selectedRuta?.estanteria) parts.push(`Estantería [${this.selectedRuta.estanteria.id}]: ${this.selectedRuta.estanteria.nombre}`);
    if (this.selectedRuta?.fila) parts.push(`Fila [${this.selectedRuta.fila.id}]: ${this.selectedRuta.fila.nombre}`);
    if (this.selectedRuta?.caja) parts.push(`Caja [${this.selectedRuta.caja.id}]: ${this.selectedRuta.caja.nombre}`);
    if (this.selectedRuta?.carpeta) parts.push(`Carpeta [${this.selectedRuta.carpeta.id}]: ${this.selectedRuta.carpeta.nombre}`);
    return parts;
  }

  // Setters de selección al hacer click en el árbol
  selectEdificio(e: any) {
    this.selectedRuta = {
      edificio: { id: e.id_edificio ?? e.id ?? 0, nombre: e.nombre ?? '-' },
      sala: null, estanteria: null, fila: null, caja: null, carpeta: null
    } as any;
    // Excepción: si solo hay edificio seleccionado, también listamos por edificio
    this.listarDocumentosPorSerie(1);
  }
  selectSala(e: any, s: any) {
    this.selectedRuta = {
      edificio: { id: e.id_edificio ?? e.id ?? 0, nombre: e.nombre ?? '-' },
      sala: { id: s.id_sala ?? s.id ?? 0, nombre: s.nombre ?? '-' },
      estanteria: null, fila: null, caja: null, carpeta: null
    } as any;
    this.listarDocumentosPorSerie(1);
  }
  selectEstanteria(est: any, edificio?: any, sala?: any) {
    // Si viene el contexto (edificio/sala), lo fijamos para completar la ruta.
    // Esto es necesario porque el árbol se auto-expande hasta estantería y el
    // usuario puede hacer clic directo en una estantería sin pasar por edificio/sala.
    if (edificio) {
      this.selectedRuta.edificio = { id: edificio.id_edificio ?? edificio.id ?? 0, nombre: edificio.nombre ?? '-' };
    }
    if (sala) {
      this.selectedRuta.sala = { id: sala.id_sala ?? sala.id ?? 0, nombre: sala.nombre ?? '-' };
    }
    this.selectedRuta.estanteria = { id: est.id_estanteria ?? est.id ?? 0, nombre: est.nombre ?? '-' };
    // Limpiar niveles inferiores
    this.selectedRuta.fila = null; this.selectedRuta.caja = null; this.selectedRuta.carpeta = null;
    this.listarDocumentosPorSerie(1);
  }
  selectFila(f: any) {
    this.selectedRuta.fila = { id: f.id_fila ?? f.id ?? 0, nombre: f.nombre ?? '-' };
    this.selectedRuta.caja = null; this.selectedRuta.carpeta = null;
    this.listarDocumentosPorSerie(1);
  }
  selectCaja(c: any) {
    this.selectedRuta.caja = { id: c.id_caja ?? c.id ?? 0, nombre: c.nombre ?? '-' };
    this.selectedRuta.carpeta = null;
    this.listarDocumentosPorSerie(1);
  }
  selectCarpeta(k: any) {
    this.selectedRuta.carpeta = { id: k.id_carpeta ?? k.id ?? 0, nombre: k.nombre ?? '-' };
    this.listarDocumentosPorSerie(1);
  }

  // ===== Conteo de documentos por nivel de la ubicación topográfica =====
  // El backend adjunta 'total_documentos' (real, contado desde la tabla documentos)
  // en cada nodo, sumando el nivel y todos sus descendientes.
  contarDocsCarpeta(k: any): number {
    return Number(k?.total_documentos ?? k?.numero_documentos) || 0;
  }
  contarDocsCaja(c: any): number {
    return Number(c?.total_documentos) || 0;
  }
  contarDocsFila(f: any): number {
    return Number(f?.total_documentos) || 0;
  }
  contarDocsEstanteria(est: any): number {
    return Number(est?.total_documentos) || 0;
  }

  // Documentos filtrados por el buscador (sobre los ya cargados en la página actual)
  get documentosFiltrados(): any[] {
    const lista = Array.isArray(this.documentos) ? this.documentos : [];
    const term = (this.busquedaDocumento || '').trim().toLowerCase();
    if (!term) { return lista; }
    return lista.filter((d: any) => {
      const nombre = (d?.nombre || d?.nombre_archivo || d?.titulo || '').toString().toLowerCase();
      return nombre.includes(term);
    });
  }

  // Total de documentos de toda la serie (reutiliza los total_documentos del árbol)
  get totalDocumentosSerie(): number {
    const lugares = Array.isArray(this.serieRespuesta?.data) ? this.serieRespuesta.data : [];
    let total = 0;
    lugares.forEach((l: any) => {
      const estanterias = Array.isArray(l?.sala?.estanterias) ? l.sala.estanterias : [];
      estanterias.forEach((est: any) => { total += Number(est?.total_documentos) || 0; });
    });
    return total;
  }

  // Retorna el último nivel seleccionado con su tipo e id
  private getUltimoSeleccion(): { tipo: string; id: number; nombre: string } | null {
    if (this.selectedRuta?.carpeta) return { tipo: 'carpeta', id: this.selectedRuta.carpeta.id, nombre: this.selectedRuta.carpeta.nombre };
    if (this.selectedRuta?.caja) return { tipo: 'caja', id: this.selectedRuta.caja.id, nombre: this.selectedRuta.caja.nombre };
    if (this.selectedRuta?.fila) return { tipo: 'fila', id: this.selectedRuta.fila.id, nombre: this.selectedRuta.fila.nombre };
    if (this.selectedRuta?.estanteria) return { tipo: 'estanteria', id: this.selectedRuta.estanteria.id, nombre: this.selectedRuta.estanteria.nombre };
    if (this.selectedRuta?.sala) return { tipo: 'sala', id: this.selectedRuta.sala.id, nombre: this.selectedRuta.sala.nombre };
    if (this.selectedRuta?.edificio) return { tipo: 'edificio', id: this.selectedRuta.edificio.id, nombre: this.selectedRuta.edificio.nombre };
    return null;
  }

  // Antes de abrir el picker de PDFs, imprime en consola el último id seleccionado
  openPickerAndLog(fileInputEl: HTMLInputElement) {

    if (!this.selectedRuta?.edificio?.id) {
      Swal.fire({
        icon: 'warning',
        title: 'Ubicación incompleta',
        text: 'Por favor, selecciona al menos el Edificio para poder subir documentos.',
        confirmButtonColor: '#3085d6'
      });
      return; // <--- ESTO EVITA QUE LLEGUE AL fileInputEl?.click();
    }
    const ultimo = this.getUltimoSeleccion();
    const idEdificioSel = this.selectedRuta?.edificio?.id ?? null;
    if (ultimo) {
      console.log(`[Subir PDFs] Última selección → tipo: ${ultimo.tipo}, id: ${ultimo.id}, nombre: ${ultimo.nombre}${idEdificioSel ? ` | id_edificio base: ${idEdificioSel}` : ''}`);
    } else {
      console.log(`[Subir PDFs] Sin selección de ruta${idEdificioSel ? ` | id_edificio base: ${idEdificioSel}` : ''}`);
    }
    fileInputEl?.click();
  }

  /**
   * El renombrado por contenido (hojas de vida) es solo para el GAD del
   * Armada del Ecuador. Se consulta una vez y se recuerda.
   */
  private async verificarEmpresaRenombrado(): Promise<void> {
    if (!this.id_empresa) { return; }

    try {
      const empresa: any = await firstValueFrom(this.seccionesService.obtenerEmpresa(this.id_empresa));
      // Se compara sin tildes y en mayúsculas, para que no falle por cómo
      // esté escrito el nombre de la empresa
      const nombre = String(empresa?.nombre_empresa || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase();

      this.esArmadaDelEcuador = nombre.includes('ARMADA DEL ECUADOR');
    } catch {
      this.esArmadaDelEcuador = false;
    }
  }

  private async solicitarTipoDocumento(): Promise<{ tipo: string; encriptar: boolean; renombrar: boolean; modo: string } | null> {
    await this.verificarEmpresaRenombrado();

    const res = await Swal.fire<{ tipo: string; encriptar: boolean; renombrar: boolean; modo: string }>({
      title: 'Formato de documento',
      html: `
        <div class="text-start">
          <label class="form-label fs-7">Seleccione el Formato de documento que va a subir</label>
          <select id="fd-tipo" class="form-select form-select-solid">
            <option value="">Seleccione una opción</option>
            <option value="DIGITAL">Digital</option>
            <option value="ELECTRONICO">Electrónico</option>
          </select>

          ${this.esArmadaDelEcuador ? `
          <div class="form-check form-check-custom form-check-solid mt-5">
            <input class="form-check-input" type="checkbox" id="fd-encriptar">
            <label class="form-check-label fw-semibold text-gray-800 ms-3" for="fd-encriptar">
              Encriptar la ruta del documento
            </label>
          </div>
          <div class="text-muted fs-8 mt-2">
            Si lo marca, la ubicación del archivo se guarda cifrada en la base de datos.
            El documento se sigue viendo y descargando igual desde el sistema.
          </div>
          ` : ''}

          ${this.esArmadaDelEcuador ? `
          <div class="form-check form-check-custom form-check-solid mt-5">
            <input class="form-check-input" type="checkbox" id="fd-renombrar">
            <label class="form-check-label fw-semibold text-gray-800 ms-3" for="fd-renombrar">
              Renombrar el archivo
            </label>
          </div>
          <div class="text-muted fs-8 mt-2">
            Para hojas de vida: el sistema lee el documento y arma el nombre del
            archivo con los datos de la persona. Si no logra identificarlos,
            se conserva el nombre original.
          </div>

          <!-- Con qué dato se arma el nombre. Solo se ve si la casilla está marcada -->
          <div id="fd-modo-caja" class="ms-8 mt-3 d-none">
            <div class="form-check form-check-custom form-check-solid form-check-sm mb-2">
              <input class="form-check-input" type="radio" name="fd-modo" id="fd-modo-nombre" value="nombre" checked>
              <label class="form-check-label text-gray-700 ms-3" for="fd-modo-nombre">
                Por nombre <span class="text-muted fs-8">— Cesar Augusto Enriquez Alvarez.pdf</span>
              </label>
            </div>
            <div class="form-check form-check-custom form-check-solid form-check-sm mb-2">
              <input class="form-check-input" type="radio" name="fd-modo" id="fd-modo-cedula" value="cedula">
              <label class="form-check-label text-gray-700 ms-3" for="fd-modo-cedula">
                Por cédula <span class="text-muted fs-8">— 0502983620.pdf</span>
              </label>
            </div>
            <div class="form-check form-check-custom form-check-solid form-check-sm">
              <input class="form-check-input" type="radio" name="fd-modo" id="fd-modo-ambos" value="ambos">
              <label class="form-check-label text-gray-700 ms-3" for="fd-modo-ambos">
                Ambos <span class="text-muted fs-8">— 0502983620 Cesar Augusto Enriquez Alvarez.pdf</span>
              </label>
            </div>
          </div>
          ` : ''}
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      width: '640px',
      heightAuto: true,
      didOpen: () => {
        // Aprovechar el alto de la pantalla para que entre todo el contenido
        // sin el scroll interno que recortaba las últimas opciones
        try {
          const popupEl = Swal.getPopup();
          if (popupEl) {
            popupEl.style.maxHeight = '92vh';
            popupEl.style.maxWidth = '95vw';
          }
          const htmlEl = Swal.getHtmlContainer();
          if (htmlEl) {
            htmlEl.style.maxHeight = 'calc(92vh - 170px)';
            htmlEl.style.overflowY = 'auto';
          }
        } catch {}

        // Las opciones de renombrado solo aparecen al marcar la casilla
        const chk = document.getElementById('fd-renombrar') as HTMLInputElement | null;
        const caja = document.getElementById('fd-modo-caja') as HTMLDivElement | null;

        chk?.addEventListener('change', () => {
          caja?.classList.toggle('d-none', !chk.checked);
        });
      },
      preConfirm: () => {
        const tipo = (document.getElementById('fd-tipo') as HTMLSelectElement)?.value || '';
        if (!tipo) {
          Swal.showValidationMessage('Seleccione el formato del documento');
          return null as any;
        }
        const encriptar = (document.getElementById('fd-encriptar') as HTMLInputElement)?.checked === true;
        const renombrar = (document.getElementById('fd-renombrar') as HTMLInputElement)?.checked === true;
        const modo = (document.querySelector('input[name="fd-modo"]:checked') as HTMLInputElement)?.value || 'nombre';
        return { tipo, encriptar, renombrar, modo } as any;
      }
    });
    if (!res.isConfirmed || !res.value) return null;
    return res.value;
  }

  // ===============================================
  // Columna Ruta: acción placeholder
  verRuta(doc: any) {
    try {
      this.toast.info('Ruta del documento disponible próximamente', 'Ruta');
    } catch (e) {
      this.toast.warning('No se pudo mostrar la ruta', 'Aviso');
    }
  }
  // ===============================================

  // Datos seleccionados para el panel lateral "Ruta"
  selectedDocRuta: {
    edificio?: string; sala?: string; estanteria?: string; fila?: string; caja?: string; carpeta?: string;
  } | null = null;
    // 1. FUNCIONES PARA ACTIVAR LOS INPUTS OCULTOS
    // ===============================================

    

    subirZipDocumentos(inputElement: HTMLInputElement) {
        // Abre el selector de archivos (solo para 1 ZIP)
        inputElement.click();
    }

    
    eliminarDocumento(id: number) {
      Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción no se puede deshacer y el archivo físico también será eliminado.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          
          this.seccionesService.eliminarDocumento(id, this.usuario_id).subscribe({
            next: (resp: any) => {
              if (resp.success) {
                Swal.fire('¡Eliminado!', resp.message, 'success');
                this.listarDocumentosPorSerie();
              }
            },
            error: (err) => {
              console.error('Error al eliminar:', err);
              Swal.fire('Error', 'No se pudo eliminar el documento', 'error');
            }
          });
    
        }
      });
    }


    eliminarPDFSMasivo(id: number) {
      Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción no se puede deshacer y el archivo físico también será eliminado.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          
          this.seccionesService.eliminarDocumentoMasivo(id).subscribe({
            next: (resp: any) => {
              if (resp.success) {
                Swal.fire('¡Eliminado!', resp.message, 'success');
                this.listarDocumentosPorSerie(); // Recargamos la lista para que desaparezca el doc
              }
            },
            error: (err) => {
              console.error('Error al eliminar:', err);
              Swal.fire('Error', 'No se pudo eliminar el documento', 'error');
            }
          });
    
        }
      });
    }
    
   
  


     listaTitulos: any[] = []; 


serieRespuesta: any = {
  seccion_superior: null,
  subseccion: { nombre: '' },
  padre: { nombre: '' },
  serie: { nombre: '' }
};



     
idSubserieActual: number | null = null;
idSerieActual: number | null = null;

  permisosDocumentales: any[] = [];
  permisosPorSubSerie: { [id_subserie: number]: any } = {};

  puedeCrearSubSerie: boolean = false;
  puedeEditarSubSerie: boolean = false;
  puedeEliminarSubSerie: boolean = false;

// Permisos globales de Serie
puedeCrearSerie = false;
puedeEditarSerie = false;
puedeEliminarSerie = false;
puedeVerSerie = false;
puedeBuscarSerie = false;
puedeSubirDocumentosSerie = false;
puedeVerDocumentoSerie = false;
puedeRegistrarDatosSerie = false;
puedeIndexarSerie = false;
puedeIndexarMasivoSerie = false;
puedeSubirExcelSerie = false;
puedeControlCalidadSerie = false;
puedeEliminarDocumentoSerie = false;
puedeFirmarDocumentoSerie = false;
puedeLimpiarDocumentoSerie = false;

// Permisos globales de Subserie
puedeVerSubSerie = false;
puedeBuscarSubSerie = false;
puedeSubirDocumentosSubSerie = false;
puedeVerDocumentoSubSerie = false;
puedeRegistrarDatosSubSerie = false;
puedeIndexarSubSerie = false;
puedeIndexarMasivoSubSerie = false;
puedeSubirExcelSubSerie = false;
puedeControlCalidadSubSerie = false;
puedeEliminarDocumentoSubSerie = false;
puedeFirmarDocumentoSubSerie = false;
puedeLimpiarDocumentoSubSerie = false;
mostrarBotonSubirDocumentos = false;

serieRutaJerarquica: any = null;

paginaActual: number = 1;
totalRegistros: number = 0;
  ultimaPagina: number = 1;
  // Input para ir a una página específica
  jumpPage: number | null = null;
 // serieRespuesta: any = null;

  isLoading: boolean = true;

  error: string | null = null;
  active = 1;

  constructor(
    public activeModal: NgbActiveModal,
    private toast: ToastrService,
    private seccionesService: IndexacionSerieService,
    public modalService: NgbModal,
    private sanitizer: DomSanitizer,
  private cdr: ChangeDetectorRef,
  private renderer: Renderer2,
  private documentoViewer: DocumentoViewerService,
  private authService: AuthService
  ) {}

  // (el modal previo a subir PDFs fue retirado a solicitud del usuario)

  ngOnInit(): void {
      // Swal de carga mientras se obtienen los datos de la ubicación
      Swal.fire({
        title: 'Cargando datos',
        text: 'Espere por favor...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      this.obtenerDatosGenerales();
    console.log('📥 ID Edificio recibido (opcional):', this.idEdificio);
    console.log('📥 ID Sala recibida (opcional):', this.idSala);
    console.log('📥 Serie recibida en modal:', this.serieBackend);
    console.log('📥 ID Indexación recibida:', this.idIndexacion);
    console.log('📥 ID UBICACION...:', this.idLugarRuta);

  if (this.serieBackend?.data) {
    this.idSeriePadre = this.serieBackend.data.padre_id ?? this.serieBackend.data.id_serie;
    this.idSubSerie = this.serieBackend.data.id_serie;

  //  console.log('✅ Serie Padre:', this.idSeriePadre);
    //console.log('✅ SubSerie (documento):', this.idSubSerie);
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  //console.log('Usuario cargado manualmente:', user);

  this.usuario_id = user.id ?? null;
  //console.log('Usuario logeado:', this.usuario_id);

  if (user && user.id_empresa != null) {
    this.id_empresa = user.id_empresa;
    //console.log('ID Empresa del usuario logeado:', this.id_empresa);
  } else {
    //console.error('No se pudo obtener el id_empresa del usuario.');
  }

  //console.log('ID Modulo recibido:', this.idModulo);
  //console.log('Nombre del proyecto recibido:', this.nombreProyecto);
  //console.log('ID Indexacion recibido:', this.idIndexacion);
  console.log('📥 ID Serie recibido:', this.idSerie);

  // 🔹 Aquí llamamos a PermisosSubSerie enviando el ID de la serie/subserie directamente
  if (this.usuario_id != null) {
    const idActual = this.idSubSerie ?? this.idSeriePadre ?? this.idSerie ?? 0; // Prioridad: SubSerie > Serie Padre > Serie
    // Logs de diagnóstico adicionales
    try {
      console.log('%c[Permisos][Init] IDs recibidos', 'color:#0a58ca;font-weight:bold');
      console.table({
        idSerieProp: this.idSerie,
        idSeriePadre: this.idSeriePadre,
        idSubSerie: this.idSubSerie,
        idActual,
        tipo_idSerie: typeof this.idSerie,
        tipo_idSeriePadre: typeof this.idSeriePadre,
        tipo_idSubSerie: typeof this.idSubSerie,
        tipo_idActual: typeof idActual,
        usuario_id: this.usuario_id,
        id_empresa: this.id_empresa
      });
    } catch {}

    this.PermisosSubSerie(this.usuario_id, idActual);
  } else {
    console.error('No se pudo determinar el ID del usuario para permisos.');
  }

  this.inicializarCamposExtra();
  this.cargarIndexacion();
  // Ya no listamos documentos al abrir; se listan al seleccionar en la ruta

  this.obtenerDatosRuta();
}


  obtenerDatosRuta() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const idUsuario = user.id || null;
  const idEmpresa = user.id_empresa || this.id_empresa || null; 

  this.isLoading = true;
  this.error = null;

  const payload = {
    idSerie: this.idSerie,
    // Serie/Subserie real de los documentos (igual criterio que el listado)
    id_serie_subserie: this.idSubSerie ?? this.idSerie,
    id_usuario: idUsuario,
    id_empresa: idEmpresa,
    // Aquí agregamos los nuevos parámetros
    id_edificio: this.idEdificio || null,
    id_sala: this.idSala || null,
    id_lugar: this.idLugarRuta || null
  };

    this.seccionesService.obtenerDatosRuta(payload).subscribe({
      next: (resp: any) => {
      console.log('RESPUESTA DATOS GENERALES CON UBICACIÓN:', resp);
      this.serieRespuesta = resp;
      // Asegurar orden consistente en la jerarquía (evita que los nodos aparezcan "desordenados" tras edición)
      try { this.ensureSerieRespuestaOrdenada(); } catch (e) { console.error('Error ordenando jerarquía:', e); }
      // Auto-expandir el árbol hasta el nivel de estantería (muestra las estanterías directo)
      try { this.autoExpandHastaEstanteria(); } catch (e) { console.error('Error auto-expandiendo hasta estantería:', e); }
      this.cdr.detectChanges();
      try { Swal.close(); } catch {}
      },
    error: (err) => {
      console.error('Error en obtenerDatosRuta:', err);
      this.error = 'Error al cargar los datos';
      this.isLoading = false;
      try { Swal.close(); } catch {}
    },
    complete: () => {
      this.isLoading = false;
      try { Swal.close(); } catch {}
    }
  });
}

  // Expande automáticamente el árbol de ubicación hasta el nivel de ESTANTERÍA,
  // de modo que al entrar ya se muestren las estanterías sin tener que navegar
  // manualmente por edificio y sala.
  private autoExpandHastaEstanteria(): void {
    this.expandKeys = {};

    // Estructura 1: serieRespuesta.data (cada item tiene edificio + una sola sala 's0')
    if (Array.isArray(this.serieRespuesta?.data) && this.serieRespuesta.data.length) {
      this.serieRespuesta.data.forEach((l: any, ei: number) => {
        this.expandKeys['e' + ei] = true;            // expandir edificio
        if (l?.sala) {
          this.expandKeys['e' + ei + 's0'] = true;   // expandir sala -> muestra las estanterías
        }
      });
      return;
    }

    // Estructura 2: serieRespuesta.edificios (edificio -> salas[] -> estanterias[])
    if (Array.isArray(this.serieRespuesta?.edificios) && this.serieRespuesta.edificios.length) {
      this.serieRespuesta.edificios.forEach((e: any, ei: number) => {
        this.expandKeys['e' + ei] = true;            // expandir edificio
        if (Array.isArray(e?.salas)) {
          e.salas.forEach((_s: any, si: number) => {
            this.expandKeys['e' + ei + 's' + si] = true; // expandir cada sala -> muestra las estanterías
          });
        }
      });
    }
  }

  // Ordena consistentemente la jerarquía de ruta para evitar reordenamientos inesperados en la UI
  private ensureSerieRespuestaOrdenada() {
    // extrae número de una cadena (primera secuencia de dígitos)
    const extractNum = (v: any) => {
      if (v === null || v === undefined) return NaN;
      if (typeof v === 'number') return v;
      const s = String(v).trim();
      const m = s.match(/-?\d+/);
      return m ? Number(m[0]) : NaN;
    };

    // comparador natural: intenta ordenar por campos preferidos numéricos y si no, por número en nombre, sino por nombre
    const cmpNatural = (a: any, b: any, preferFields: string[] = []) => {
      for (const f of preferFields) {
        const va = a?.[f];
        const vb = b?.[f];
        if (va !== undefined && vb !== undefined) {
          const na = Number(va);
          const nb = Number(vb);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
        }
      }
      const na = extractNum(a?.nombre ?? a?.id ?? '');
      const nb = extractNum(b?.nombre ?? b?.id ?? '');
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return (a?.nombre || '').toString().localeCompare((b?.nombre || '').toString());
    };

    const sortCarpetas = (cajas: any[]) => {
      if (!Array.isArray(cajas)) return;
      cajas.forEach((c: any) => {
        if (Array.isArray(c.carpetas)) c.carpetas.sort((x: any, y: any) => cmpNatural(x, y, ['id_carpeta']));
      });
      cajas.sort((x: any, y: any) => cmpNatural(x, y, ['numero_caja', 'id_caja']));
    };

    const sortFilas = (estanterias: any[]) => {
      if (!Array.isArray(estanterias)) return;
      estanterias.forEach((est: any) => {
        if (Array.isArray(est.filas)) {
          est.filas.sort((x: any, y: any) => cmpNatural(x, y, ['id_fila']));
          est.filas.forEach((f: any) => {
            if (Array.isArray(f.cajas)) sortCarpetas(f.cajas);
          });
        }
      });
      estanterias.sort((x: any, y: any) => cmpNatural(x, y, ['id_estanteria']));
    };

    // Caso 1: estructura plana en serieRespuesta.data
    if (this.serieRespuesta?.data && Array.isArray(this.serieRespuesta.data)) {
      this.serieRespuesta.data.sort((a: any, b: any) => cmpNatural(a.edificio || {}, b.edificio || {}, ['id_edificio']));
      this.serieRespuesta.data.forEach((l: any) => {
        if (l?.sala && l.sala.estanterias) sortFilas(l.sala.estanterias as any[]);
      });
    }

    // Caso 2: estructura jerárquica en serieRespuesta.edificios
    if (this.serieRespuesta?.edificios && Array.isArray(this.serieRespuesta.edificios)) {
      this.serieRespuesta.edificios.sort((a: any, b: any) => cmpNatural(a, b, ['id_edificio']));
      this.serieRespuesta.edificios.forEach((e: any) => {
        if (Array.isArray(e.salas)) {
          e.salas.sort((a: any, b: any) => cmpNatural(a, b, ['id_sala']));
          e.salas.forEach((s: any) => {
            if (Array.isArray(s.estanterias)) sortFilas(s.estanterias as any[]);
          });
        }
      });
    }
  }


// En tu componente (.ts)
get rutaCompleta(): string {
  if (!this.serieRespuesta) return 'Cargando...';

  try {
    const serie = this.serieRespuesta.nombre;
    const edificio = this.serieRespuesta.edificios[0]?.nombre || '';
    const sala = this.serieRespuesta.edificios[0]?.salas[0]?.nombre || '';
    
    // Filtramos los vacíos para que no se vean guiones raros
    const ruta = [serie, edificio, sala].filter(Boolean);
    
    return ruta.join(' > ');
  } catch (e) {
    return 'Ruta no disponible';
  }
}


obtenerDatosGenerales() {
  if (this.idSerie === null) {
    console.error('No se pudo determinar el ID de la serie.');
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const payload = { 
    idSerie: this.idSerie,
    id_usuario: user.id || null,
    id_empresa: user.id_empresa || this.id_empresa || null
  };

  this.isLoading = true;
  this.seccionesService.obtenerDatosGenerales(payload).subscribe({
   next: (resp: any) => {
      // AQUÍ: Guardamos en su variable específica
      this.serieRutaJerarquica = resp.data || resp; 
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error al obtener datos generales:', err);
    },
    complete: () => {
      this.isLoading = false;
    }
  });
}
  

inicializarCamposExtra() {
    if (this.camposExtraTitulos && this.camposExtraTitulos.length > 0) {
        
        this.campos = this.camposExtraTitulos.map((titulo, index) => ({
            titulo: titulo, 
            valor: this.camposExtraValores[index] || '',
            // 🚨 PROPIEDAD CLAVE: Marcamos este campo como bloqueado (de la BD)
            isLocked: true 
        }));

    } else {
        this.campos = []; 
    }
}


cargarIndexacion() {

  const data = {
    idIndexacion: this.idIndexacion,     // puede ser null o número
    idSerie: this.idSeriePadre,
    idSubSerie: this.idSubSerie,
    id_empresa: this.id_empresa
  };

  console.log('📤 Enviando TODOS los datos:', data);



    this.seccionesService.buscarIndexacion(data)
.subscribe((resp: any) => {

  console.log('✅ RESPUESTA BACKEND:', resp);

  if (resp && resp.data) {

    const indexacion = resp.data;

    this.campos = indexacion.campos_extra
      ? JSON.parse(indexacion.campos_extra)
      : [];

if (resp.success && resp.data.archivo_url) {

  const archivos = JSON.parse(resp.data.archivo_url);

  this.imagenesPDF = archivos.map((archivo: string) => {
    return URL_BACKEND + 'storage/' + archivo;
  });

  setTimeout(() => {
    this.renderizarPDFsDesdeBD();
  }, 200);
}




      console.log('📥 PDFs cargados:', this.imagenesPDF);

    this.nroFolios = indexacion.nro_folios;
    this.nroPaginasDigitales = indexacion.nro_paginas_digitales;
    this.folioSecuencialInicio = indexacion.folio_secuencial_inicio;
    this.folioSecuencialFin = indexacion.folio_secuencial_fin;
    this.tipoSoporte = indexacion.tipo_soporte;
    this.tipoAcceso = indexacion.tipo_acceso;
    this.estadoConservacion = indexacion.estado_conservacion;
    this.revisadoDigitadoPor = indexacion.revisado_digitado_por;
    this.nroCaja = indexacion.nro_caja;
    this.nroCarpetaFisica = indexacion.nro_carpeta_fisica;
    this.nroTomo = indexacion.nro_tomo;
    this.nroEstanteria = indexacion.nro_estanteria;
    this.nroBandeja = indexacion.nro_bandeja;
    this.observacionesRespuesta = indexacion.observaciones_respuesta;
    // ✅ ESTO FALTABA
    this.fechaApertura = indexacion.fecha_apertura;
    this.fechaCierre   = indexacion.fecha_cierre;
    this.observacionesRespuesta = indexacion.observaciones_respuesta || '';
    // ✅ CAMPOS QUE FALTABAN
    this.plazoGestion      = indexacion.plazo_gestion;
    this.plazoCentral      = indexacion.plazo_central;
    this.plazoIntermedio   = indexacion.plazo_intermedio;
    this.plazoHistorico    = indexacion.plazo_historico;
    this.baseLegal         = indexacion.base_legal;
    this.disposicionFinal  = indexacion.disposicion_final;
    this.tecnicaSeleccion  = indexacion.tecnica_seleccion;

    console.log('📥 Datos cargados correctamente en el formulario');
  }

}, error => {
  console.error('❌ Error backend:', error);
});


}

renderizarPDFsDesdeBD() {

    this.pdfCanvasRefs.forEach((canvasRef, index) => {

      const pdfUrl = this.imagenesPDF[index];
      if (!pdfUrl) return;

      pdfjsLib.getDocument(pdfUrl).promise.then((pdf: any) => {

        pdf.getPage(1).then((page: any) => {

          const viewport = page.getViewport({ scale: 1.3 });
          const canvas = canvasRef.nativeElement;
          const context = canvas.getContext('2d')!;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          page.render({
            canvasContext: context,
            viewport
          });

        });
      });
    });
  }



  ngAfterViewInit() {
    this.ctx = this.pdfCanvas.nativeElement.getContext('2d')!;
    // Si ya tienes urls sanitizadas al cargar, carga el primero
    if (this.urlsSanitizadas.length > 0) {
      this.loadPdf(this.urlsSanitizadas[0]);
    }
  }

  verArchivoTemp(file: File): void {
    const fileReader = new FileReader();
    fileReader.onload = async () => {
      const typedarray = new Uint8Array(fileReader.result as ArrayBuffer);
      const loadingTask = (window as any).pdfjsLib.getDocument({
        data: typedarray,
      });

      const pdf = await loadingTask.promise;
      this.pdfDocTemp = pdf;
      this.pageCountTemp = pdf.numPages;
      this.pageNumTemp = 1;
      this.renderTempPage(this.pageNumTemp);
    };

    fileReader.readAsArrayBuffer(file);
  }

  renderTempPage(num: number): void {
    this.pdfDocTemp.getPage(num).then((page: any) => {
      const canvas: any = document.querySelector('#pdfCanvasTemp');
      const ctx = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.5 });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      page.render(renderContext);
    });
  }

  prevPageTemp(): void {
    if (this.pageNumTemp > 1) {
      this.pageNumTemp--;
      this.renderTempPage(this.pageNumTemp);
    }
  }

  nextPageTemp(): void {
    if (this.pageNumTemp < this.pageCountTemp) {
      this.pageNumTemp++;
      this.renderTempPage(this.pageNumTemp);
    }
  }

  siguientePDF() {
    if (this.indiceActual < this.archivosProcesados.length - 1) {
      this.indiceActual++;
    }
  }

  anteriorPDF() {
    if (this.indiceActual > 0) {
      this.indiceActual--;
    }
  }

  // Sanitiza las URLs SOLO cuando cambian los archivos procesados
  sanitizeUrls() {
    // Sólo asigna el string URL sin sanitizar
    this.urlsSanitizadas = this.archivosProcesados.map(
      (archivo) => archivo.url
    );
  }

  // Método para cargar PDF en el canvas usando PDF.js
  loadPdf(url: string) {
    // Si quieres evitar error de CORS, la URL debe estar permitida en backend
    pdfjsLib
      .getDocument(url)
      .promise.then((pdfDoc_: any) => {
        this.pdfDoc = pdfDoc_;
        this.pageCount = pdfDoc_.numPages;
        this.pageNum = 1;
        this.renderPage(this.pageNum);
      })
      .catch((error: any) => {
        this.toast.error('Error cargando PDF: ' + error.message);
      });
  }

  async renderPage(num: number) {
    if (!this.pdfDoc) return;
    const page = await this.pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: this.scale });
    const canvas = this.pdfCanvas.nativeElement;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Renderiza página en canvas
    const renderContext = {
      canvasContext: this.ctx,
      viewport: viewport,
    };
    await page.render(renderContext).promise;

    // Renderiza capa de texto manualmente
    const textLayerDiv = this.textLayer.nativeElement;
    textLayerDiv.innerHTML = ''; // limpia contenido anterior
    textLayerDiv.style.position = 'absolute';
    textLayerDiv.style.top = '0';
    textLayerDiv.style.left = '0';
    textLayerDiv.style.height = `${viewport.height}px`;
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.userSelect = 'text';

    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      const span = document.createElement('div');
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);

      span.style.position = 'absolute';
      span.style.left = `${tx[4]}px`;
      span.style.top = `${tx[5] - item.height}px`;
      span.style.fontSize = `${item.height}px`;
      span.style.transform = `scaleX(${item.width / item.height})`;
      span.style.whiteSpace = 'pre';
      span.textContent = item.str;
      span.style.color = 'transparent'; // para solo selección, no visible

      textLayerDiv.appendChild(span);
    }
  }

  prevPage() {
    if (this.pageNum <= 1) return;
    this.pageNum--;
    this.renderPage(this.pageNum);
  }

  onToggleDocSelected(doc: any) {
    // Actualiza lista local de seleccionados
    if (doc._checked) {
      if (!this.documentosSeleccionados.find((d: any) => d.id === doc.id)) {
        this.documentosSeleccionados.push(doc);
      }
    } else {
      this.documentosSeleccionados = this.documentosSeleccionados.filter((d: any) => d.id !== doc.id);
    }
    console.log('Documentos seleccionados:', this.documentosSeleccionados.map((d: any) => d.id || d.id_documento));
  }

  toggleSelectAll() {
    if (this.selectAllDocs) {
      this.documentosSeleccionados = this.documentos.map(d => { d._checked = true; return d; });
    } else {
      this.documentosSeleccionados = [];
      this.documentos.forEach(d => d._checked = false);
    }
    console.log('Select all toggled:', this.selectAllDocs, 'Selected count:', this.documentosSeleccionados.length);
  }

  trasladarDocumentos(event: Event) {
    event.stopPropagation();
    if (!this.documentosSeleccionados || this.documentosSeleccionados.length === 0) return;
    // Abrir modal para trasladar documentos
    const modalRef = this.modalService.open(MoverDocumentoComponent, { size: 'lg', centered: true, backdrop: 'static' });
    // Pasamos documentos seleccionados al modal
    modalRef.componentInstance.documentos = this.documentosSeleccionados;
    // Pasamos la ruta jerárquica seleccionada al modal para que el modal sepa de dónde vienen
    modalRef.componentInstance.serieRutaJerarquica = this.serieRutaJerarquica;
    // Pasamos la ubicación topográfica actualmente seleccionada (edificio/sala/estanteria/fila/caja/carpeta)
    modalRef.componentInstance.ubicacionTopografica = this.selectedRuta;
    // Pasamos la estructura completa de la ruta (árbol) para que el modal la renderice directamente
    modalRef.componentInstance.ubicacionTree = this.serieRespuesta?.data || null;
    // Pasamos el idSerie y idLugarRuta para que el modal pueda consultar datos si necesita
    modalRef.componentInstance.idSerie = this.idSerie;
    modalRef.componentInstance.idLugarRuta = this.idLugarRuta ?? null;
    modalRef.result.then((res) => {
      // Al cerrar el modal, si devuelve true, limpiamos la selección
      if (res === true) {
        this.selectAllDocs = false;
        this.documentosSeleccionados = [];
        this.documentos.forEach(d => d._checked = false);
        // Recargar la lista de documentos para reflejar los cambios de ubicación
        try { this.listarDocumentosPorSerie(this.paginaActual); } catch (e) { console.error('Error recargando documentos tras traslado:', e); }
        // Recargar el árbol de ubicación para reflejar los nuevos conteos por carpeta/caja/etc.
        try { this.obtenerDatosRuta(); } catch (e) { console.error('Error recargando ubicación tras traslado:', e); }
      }
    }).catch(() => {});
  }

  nextPage() {
    if (this.pageNum >= this.pageCount) return;
    this.pageNum++;
    this.renderPage(this.pageNum);
  }

  close() {
    this.activeModal.close();
  }

  agregarCampo() {
    this.campos.push({ valor: '',isLocked: false});
  }




  eliminarCampo(index: number) {
    this.campos.splice(index, 1);
  }

  onFileSelectedtemp(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      console.log('Archivo seleccionado:', file); // para verificar en consola

      // ✅ Guardamos el archivo en el array para usarlo en guardar()
      this.archivosSeleccionados = [file]; // si solo manejas uno
      // o this.archivosSeleccionados.push(file); // si quieres permitir varios

      if (file.type === 'application/pdf') {
        this.archivoSeleccionadoTemp = file;
        this.loadPDF(file);
      } else {
        alert('Por ahora solo se puede mostrar vista previa de archivos PDF.');
      }
    }
  }

  loadPDF(file: File) {
  const reader = new FileReader();
  reader.onload = async () => {
    const typedarray = new Uint8Array(reader.result as ArrayBuffer);

    const loadingTask = pdfjsLib.getDocument(typedarray);
    this.pdfDocTemp = await loadingTask.promise;
    this.pageCountTemp = this.pdfDocTemp.numPages;
    this.pageNumTemp = 1;

    // ✅ Pasamos el canvas único
    this.renderPageTemp(this.pageNumTemp, this.pdfCanvasTemp.nativeElement);
  };
  reader.readAsArrayBuffer(file);
}

  renderPageTemp(pageNumber: number, canvas: HTMLCanvasElement) {
  this.pdfDocTemp.getPage(pageNumber).then((page: any) => {
    const context = canvas.getContext('2d')!;

    const maxWidth = 300;
    const viewportBase = page.getViewport({ scale: 1 });
    const scale = maxWidth / viewportBase.width;
    const viewport = page.getViewport({ scale: scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    page.render({
      canvasContext: context,
      viewport: viewport
    });
  });
}



  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.archivosSeleccionados = Array.from(event.target.files);
    } else {
      this.archivosSeleccionados = [];
    }
  }


  seleccionarInput(i: number) {
    this.inputSeleccionadoIndex = i;
  }


  seleccionarTexto() {
    if (
      this.inputSeleccionadoIndex !== null &&
      this.campos[this.inputSeleccionadoIndex]
    ) {
      this.campos[this.inputSeleccionadoIndex].valor = this.textoSeleccionado;
      this.showMenu = false;
    }
  }

  // Convertir PDF a imágenes
  async hacerOCR() {
    if (!this.archivoSeleccionadoTemp) {
      alert('Por favor, selecciona un archivo PDF antes de continuar.');
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = async (e: any) => {
      const typedarray = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
      this.imagenesPDF = [];

      const maxWidth = 800; // 🔹 ancho máximo que quieres para la imagen

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        // Obtenemos el viewport original a escala 1
        const viewportOriginal = page.getViewport({ scale: 1 });

        // Calculamos la escala proporcional según maxWidth
        const scale = maxWidth / viewportOriginal.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const imageData = canvas.toDataURL('image/png');
        this.imagenesPDF.push(imageData);
      }

      setTimeout(() => this.renderizarCanvas(), 0);
      alert(`PDF convertido a ${this.imagenesPDF.length} imagen(es) PNG.`);
    };

    fileReader.readAsArrayBuffer(this.archivoSeleccionadoTemp);
  }

  // === Modal: Ver Texto OCR ===
  selectedOcrText: string = '';
  selectedDocId: any = null;
  selectedDocName: string = '';
  @ViewChild('ocrViewer', { static: false }) ocrViewer!: any;

  verTextoOCR(doc: any) {
    try {
      const raw = doc?.datos_ocr ?? '';
      this.selectedOcrText = String(raw).trim();
    } catch {
      this.selectedOcrText = '';
    }
    // Guardamos identificación y nombre para el encabezado y resaltar fila
    this.selectedDocId = doc?.id || doc?.id_documento || null;
    this.selectedDocName = doc?.nombre || doc?.nombre_archivo || '';
    this.modalService.open(this.ocrViewer, { size: 'lg', scrollable: true, centered: true });
  }

  // === Modal: Ver Parámetros ===
  selectedParams: Array<any> = [];
  @ViewChild('paramViewer', { static: false }) paramViewer!: any;

  verParametros(doc: any) {
    try {
      let raw: any = doc?.parametros_indexados_values;
      if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch {}
      }
      if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch {}
      }
      this.selectedParams = Array.isArray(raw) ? raw : [];
    } catch {
      this.selectedParams = [];
    }
    // Guardamos identificación y nombre para encabezado y resaltar fila
    this.selectedDocId = doc?.id || doc?.id_documento || null;
    this.selectedDocName = doc?.nombre || doc?.nombre_archivo || '';
    this.modalService.open(this.paramViewer, { size: 'lg', scrollable: true, centered: true });
  }


  // Dibujar imágenes en canvas
  renderizarCanvas() {
    this.imagenesPDF.forEach((imgSrc, i) => {
      const canvas = document.querySelectorAll('canvas')[
        i
      ] as HTMLCanvasElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
    });
  }


renderCanvasZoom() {
  if (!this.pdfCanvasTemp || this.selectedPage == null) return;

  const canvas = this.pdfCanvasTemp.nativeElement;
  const ctx = canvas.getContext('2d')!;
  const src = this.imagenesPDF[this.selectedPage];
  if (!src) return;

  const img = new Image();
  img.src = src;

  img.onload = () => {
    // limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // aplicar arrastre
    ctx.translate(this.offsetX, this.offsetY);

    // aplicar zoom
    ctx.scale(this.zoomFactor, this.zoomFactor);

    // dibujar la imagen con tamaño original
    ctx.drawImage(img, 0, 0, img.width, img.height);

    ctx.restore();
  };
}






  activarZoom() {
    this.zoomActivo = !this.zoomActivo;
    
  }

zoomIn() {
  this.zoomFactor += 0.2;
  this.renderCanvasZoom();
}

zoomOut() {
  this.zoomFactor = Math.max(0.2, this.zoomFactor - 0.2);
  this.renderCanvasZoom();
}




 startDrag(event: MouseEvent, pageIndex: number) {
  if (!this.zoomFactor || this.zoomFactor === 1) return; // solo si hay zoom
  this.isDragging = true;
  this.startX = event.clientX;
  this.startY = event.clientY;
  this.dragPageIndex = pageIndex;
}

dragImage(event: MouseEvent, pageIndex: number) {
  if (!this.isDragging || this.dragPageIndex !== pageIndex) return;
  const dx = (event.clientX - this.startX) / this.zoomFactor;
  const dy = (event.clientY - this.startY) / this.zoomFactor;

  this.offsetX += dx;
  this.offsetY += dy;

  this.startX = event.clientX;
  this.startY = event.clientY;
}

stopDrag() {
  this.isDragging = false;
  this.dragPageIndex = null;
}





activarRecorte() {
  this.recorteActivo = !this.recorteActivo;

  if (this.recorteActivo) {
    this.zoomActivo = false; // opcional, para desactivar interacción de zoom
    // Actualizar el cursor de todos los canvas visibles
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      (canvas as HTMLCanvasElement).style.cursor = 'crosshair';
    });
  } else {
    // cuando se desactiva recorte, volver a grab si quieres arrastrar
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      (canvas as HTMLCanvasElement).style.cursor = 'grab';
    });
  }
}









  onMouseDown(event: MouseEvent, pageIndex: number) {
     if (!this.recorteActivo) return;
    this.isDrawing = true;
    this.startX = event.offsetX;
    this.startY = event.offsetY;
    this.selectedPage = pageIndex;
    this.recorte = null;
    const canvas = event.target as HTMLCanvasElement;
  canvas.style.cursor = 'crosshair'; // cursor + al iniciar selección
  }

  onMouseMove(event: MouseEvent, pageIndex: number) {
  if (!this.isDrawing || this.selectedPage !== pageIndex) return;

  const currentX = event.offsetX;
  const currentY = event.offsetY;
  const width = currentX - this.startX;
  const height = currentY - this.startY;

  const canvas = event.target as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const img = new Image();
  img.src = this.imagenesPDF[pageIndex];
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // rectángulo transparente
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.startX, this.startY, width, height);

    // asegurarnos que el cursor siga siendo crosshair
    if (this.recorteActivo) {
      canvas.style.cursor = 'crosshair';
    }
  };
}

onMouseUp(event: MouseEvent, pageIndex: number) {
  this.isDrawing = false;

  const endX = event.offsetX;
  const endY = event.offsetY;
  const width = endX - this.startX;
  const height = endY - this.startY;

  const canvas = event.target as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  // crear canvas temporal para el recorte
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = Math.abs(width);
  tempCanvas.height = Math.abs(height);
  const tempCtx = tempCanvas.getContext('2d')!;

  tempCtx.drawImage(
    canvas,
    this.startX,
    this.startY,
    width,
    height,
    0,
    0,
    Math.abs(width),
    Math.abs(height)
  );

  this.recorte = tempCanvas.toDataURL('image/png');

  console.log('Recorte generado:', this.recorte);

  // Mantener cursor crosshair
  if (this.recorteActivo) {
    canvas.style.cursor = 'crosshair';
  } else {
    canvas.style.cursor = 'grab';
  }

  // Ejecutar OCR automáticamente
  this.hacerOCDelRecorte();
}





async hacerOCDelRecorte() {
  if (!this.recorte) return;

  if (this.campos.length === 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Atención',
      text: 'Primero debe crear un input para colocar el texto OCR.'
    });
    return;
  }

  const worker = createWorker({
    logger: (m: any) => console.log(m)
  });

  await worker.load();
  await worker.loadLanguage('spa');
  await worker.initialize('spa');

  const { data: { text } } = await worker.recognize(this.recorte);

  await worker.terminate();

  // Buscar el primer input vacío
  const primerInputVacio = this.campos.find(c => !c.valor);
  let inputSeleccionado;

  if (primerInputVacio) {
    primerInputVacio.valor = text;
    inputSeleccionado = primerInputVacio;
  } else {
    const reemplazar = await Swal.fire({
      title: 'Todos los inputs tienen contenido',
      text: '¿Desea reemplazar el contenido del primer input existente? Seleccione "Cancelar" para crear un nuevo input.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reemplazar',
      cancelButtonText: 'No, crear nuevo input'
    });

    if (reemplazar.isConfirmed) {
      // En lugar de reemplazar, crear un nuevo input al final
      const nuevoCampo = { valor: text, titulo: '' };
      this.campos.push(nuevoCampo);
      inputSeleccionado = nuevoCampo;
    } else {
      const nuevoCampo = { valor: text, titulo: '' };
      this.campos.push(nuevoCampo);
      inputSeleccionado = nuevoCampo;
    }

  }

  // Mostrar a dónde se está yendo el contenido OCR
  if (!inputSeleccionado.titulo) {
    await Swal.fire({
      icon: 'info',
      title: 'OCR sin título',
      text: 'El contenido OCR se está yendo a un input sin título asignado.'
    });
  } else {
    await Swal.fire({
      icon: 'success',
      title: 'OCR colocado',
      text: `El contenido OCR se está yendo al título: ${inputSeleccionado.titulo}`
    });
  }
}




  guardar() {
    if (this.campos.length === 0) {
        this.toast.warning('Agrega al menos un campo de parámetro.');
        return;
    }

    // Nota: 'archivosSeleccionados' debe ser la variable que contiene el PDF
    if (this.archivosSeleccionados.length === 0) {
        this.toast.warning('Debes seleccionar al menos un archivo para guardar.');
        return;
    }

    // 1. Crear FormData
    const formData = new FormData();

    // 2. PARÁMETROS DINÁMICOS (Campos Extra)
    formData.append('campos', JSON.stringify(this.campos));

    // 3. DATOS DE IDENTIFICACIÓN (idIndexacion, idSerie, idSubSerie, id_empresa)
    if (this.idIndexacion) {
        formData.append('idIndexacion', this.idIndexacion.toString());
    }
    if (this.idSeriePadre) {
        formData.append('idSerie', this.idSeriePadre.toString());
    }
    if (this.idSubSerie) {
        formData.append('idSubSerie', this.idSubSerie.toString());
    }
    if (this.id_empresa) {
        formData.append('id_empresa', this.id_empresa.toString());
        console.log('ID Empresa enviado en FormData:', this.id_empresa);
    } else {
        this.toast.error('Error: ID de la empresa no encontrado.');
        console.error('⚠️ El ID de la empresa es requerido y no está disponible.');
        return; 
    }

    // 4. DATOS DEL DOCUMENTO (CAMPOS DEL CARD)
    
    // Información Básica
    formData.append('nombreDocumento', this.nombreDocumento);
    formData.append('observaciones', this.observaciones);

    
    // ✅ AQUÍ ESTABA EL ERROR
   formData.append('observacionesRespuesta', this.observacionesRespuesta || '');

    // Fechas Extremas (Se mantienen comentadas si se eliminaron del HTML, pero se envían si las variables existen)
     formData.append('fechaApertura', this.fechaApertura);
     formData.append('fechaCierre', this.fechaCierre);
    
    // Folios y Páginas
    if (this.nroFolios !== null) formData.append('nroFolios', this.nroFolios.toString());
    if (this.folioSecuencialInicio !== null) formData.append('folioSecuencialInicio', this.folioSecuencialInicio.toString());
    if (this.folioSecuencialFin !== null) formData.append('folioSecuencialFin', this.folioSecuencialFin.toString());
    if (this.nroPaginasDigitales !== null) formData.append('nroPaginasDigitales', this.nroPaginasDigitales.toString());
    
    // Clasificación y Conservación
    formData.append('tipoSoporte', this.tipoSoporte);
    formData.append('tipoAcceso', this.tipoAcceso);
    formData.append('estadoConservacion', this.estadoConservacion);
    // ✅ USUARIO QUE REVISA Y DIGITA
    formData.append('revisadoDigitadoPor', this.revisadoDigitadoPor);
    // Nota: El antiguo 'destinoFinal' se reemplaza o complementa con 'disposicionFinal'
    // formData.append('destinoFinal', this.destinoFinal); 

    // ✅ NUEVOS CAMPOS DE PLAZOS DE CONSERVACIÓN (TRD)
    
    // Plazos de Retención (Años)
    if (this.plazoGestion !== null) formData.append('plazoGestion', this.plazoGestion.toString());
    if (this.plazoCentral !== null) formData.append('plazoCentral', this.plazoCentral.toString());
    formData.append(
  'plazoIntermedio',
  this.plazoIntermedio?.trim() === '' ? '-' : this.plazoIntermedio
);

formData.append(
  'plazoHistorico',
  this.plazoHistorico?.trim() === '' ? '-' : this.plazoHistorico
);


    // Base Legal
    formData.append('baseLegal', this.baseLegal);
    
    // Disposición Final y Técnica de Selección
    formData.append('disposicionFinal', this.disposicionFinal);
    formData.append('tecnicaSeleccion', this.tecnicaSeleccion);
    
    // Ubicación Topográfica
    if (this.nroCaja !== null) formData.append('nroCaja', this.nroCaja.toString());
    if (this.nroCarpetaFisica !== null) formData.append('nroCarpetaFisica', this.nroCarpetaFisica.toString());
    if (this.nroTomo !== null) formData.append('nroTomo', this.nroTomo.toString());
    if (this.nroEstanteria) formData.append('nroEstanteria', this.nroEstanteria);
    if (this.nroBandeja) formData.append('nroBandeja', this.nroBandeja);

    // 5. ARCHIVOS SELECCIONADOS
    this.archivosSeleccionados.forEach((file) => {
        formData.append('archivos[]', file, file.name);
    });

    // 6. LLAMADA AL SERVICIO
    this.seccionesService.registrarDocumento(formData).subscribe({
        next: (res) => {
            this.toast.success('Datos guardados correctamente');
            this.activeModal.close(true);
        },
        error: (err) => {
            this.toast.error('Error al guardar los datos');
            console.error('Error en guardar documentos:', err);
        },
    });
}



base64ToBlob(base64: string, type: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}


onMultipleFilesSelected(event: Event): void {
  const input = event.target as HTMLInputElement;

  if (input.files && input.files.length > 0) {
    this.archivosSeleccionados = Array.from(input.files); // Guarda en un array
    console.log('Archivos seleccionados:', this.archivosSeleccionados);
  }
}


// Función principal para subir varios PDFs
async subirVariosPDFs() {
  if (!this.archivosSeleccionados.length) {
    alert('No se han seleccionado archivos');
    return;
  }

  // 1️⃣ Subir todos los archivos inicialmente para inspección
  const formData = new FormData();
  formData.append('id_proyecto', this.idProyecto);
  formData.append('id_serie', String(this.idSerie)); // 👈 agregamos el idSerie
  // Enviar id_lugar si el modal recibió la ubicación específica
  if (this.idLugarRuta) formData.append('id_lugar', String(this.idLugarRuta));
  this.archivosSeleccionados.forEach(file => formData.append('archivos[]', file));

  this.seccionesService.archivos(formData).subscribe(
    async (res: any) => {
      console.log('Respuesta del backend:', res);

      // 2️⃣ Filtrar PDFs con más de una página
      const multiplesPaginas = res.archivos.filter((a: any) => a.paginas && a.paginas > 1);

      // 3️⃣ Procesar cada PDF con múltiples páginas
      for (const archivo of multiplesPaginas) {
        const result = await Swal.fire({
          title: 'PDF con varias páginas',
          text: `El archivo "${archivo.nombre}" tiene ${archivo.paginas} páginas. ¿Deseas separarlo o subirlo tal cual?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Separar',
          cancelButtonText: 'Subir tal cual'
        });

        if (result.isConfirmed) {
          // 🔹 Separar PDF (devuelve array de { nombre, file: base64 })
          const pdfsSeparados = await this.seccionesService
            .separarPDF(archivo.nombre)
            .toPromise() || [];

          // 🔹 Subir cada PDF separado
          for (const pdf of pdfsSeparados) {
            const blob = this.base64ToBlob(pdf.file, 'application/pdf');
            const form = new FormData();
            form.append('id_proyecto', this.idProyecto);
            form.append('id_serie', String(this.idSerie)); // 👈 también en cada PDF separado
            if (this.idLugarRuta) form.append('id_lugar', String(this.idLugarRuta));
            form.append('archivos[]', blob, pdf.nombre);
            await this.seccionesService.archivos(form).toPromise();
            console.log('PDF separado subido:', pdf.nombre);
          }

        } else {
          // 🔹 Subir tal cual sin separar
          const file = this.archivosSeleccionados.find(f => f.name === archivo.nombre);
          if (file) {
            const form = new FormData();
            form.append('id_proyecto', this.idProyecto);
            form.append('id_serie', String(this.idSerie)); // 👈 también aquí
            if (this.idLugarRuta) form.append('id_lugar', String(this.idLugarRuta));
            form.append('archivos[]', file);
            await this.seccionesService.archivos(form).toPromise();
            console.log('PDF subido tal cual:', archivo.nombre);
          }
        }
      }

      // 4️⃣ Informar al usuario que todo se subió
      Swal.fire('Listo', 'Todos los archivos se subieron correctamente', 'success');
    },
    err => {
      console.error('Error al subir archivos', err);
      Swal.fire('Error', 'No se pudieron subir los archivos', 'error');
    }
  );
}



  async subirCarpetaCompleta(event: any, tipo: string) {
    const allFiles: File[] = Array.from(event.target.files);
    // Solicitar SIEMPRE el tipo de documento
    const tipoSel = await this.solicitarTipoDocumento();
    if (!tipoSel) { event.target.value = ''; return; }
    this.tipoDocSeleccionado = tipoSel.tipo;
    this.encriptarRuta = tipoSel.encriptar;
    this.renombrarPorContenido = tipoSel.renombrar;
    this.modoRenombrado = tipoSel.modo;
  
  // 1. FILTRAR: Solo PDFs
  const pdfFiles = allFiles.filter(file => 
    file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
  );

  if (pdfFiles.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Sin PDFs',
      text: 'No se encontraron archivos PDF en la carpeta seleccionada.',
      confirmButtonColor: '#3085d6'
    });
    return;
  }

  // Obtención de datos de sesión
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const usuario_id = user.id || user.usuario_id || null;
  const id_empresa = user.id_empresa || this.id_empresa || null;
  
  const totalArchivos = pdfFiles.length;
  const errores: string[] = [];
  // Documentos rechazados por el backend (ya cargados en otra serie/ubicación)
  const erroresAcumulados: any[] = [];

  Swal.fire({
    title: 'Procesando Carpeta',
    html: `Se detectaron <b>${totalArchivos}</b> archivos PDF.<br>Iniciando carga secuencial...`,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });

  // 2. PROCESO SECUENCIAL
    for (let i = 0; i < totalArchivos; i++) {
      const file = pdfFiles[i];
    const porcentaje = Math.round(((i + 1) / totalArchivos) * 100);

    Swal.update({
      html: `
        <div style="text-align: left; margin-top: 10px;">
          <p style="margin-bottom: 5px;">Subiendo: <b class="text-primary">${file.name}</b></p>
          <small>Progreso: ${i + 1} de ${totalArchivos}</small>
          <div class="progress" style="height: 12px; margin-top: 5px;">
            <div class="progress-bar progress-bar-striped progress-bar-animated bg-info" 
                 role="progressbar" 
                 style="width: ${porcentaje}%">
            </div>
          </div>
        </div>
      `
    });

      const formData = new FormData();
      formData.append('documentos[]', file);
      
      const idDestino = this.idSubSerie ?? this.idSerie;
      const campoId = this.idSubSerie ? 'id_subserie' : 'id_serie';
      
      if (idDestino) formData.append(campoId, String(idDestino));
      if (id_empresa) formData.append('id_empresa', String(id_empresa));
      // Añadir id_lugar si está disponible (nuevo esquema usa id_lugar)
      if (this.idLugarRuta) {
        formData.append('id_lugar', String(this.idLugarRuta));
      }

      // --- EL CAMBIO CRÍTICO ESTÁ AQUÍ ---
      // Cambiamos 'id_usuario' por 'usuario_id' para que Laravel no dé error
      if (usuario_id) {
        formData.append('usuario_id', String(usuario_id));
      }
      
      formData.append('tipo_subida', tipo);
      if (this.tipoDocSeleccionado) formData.append('tipo_documento', this.tipoDocSeleccionado);
      // Guardar la ruta cifrada en la base de datos (opcional, se marca en el modal)
      formData.append('encriptar_ruta', this.encriptarRuta ? '1' : '0');
      // Renombrar el PDF con el nombre de la persona (hojas de vida)
      formData.append('renombrar_por_contenido', this.renombrarPorContenido ? '1' : '0');
      formData.append('modo_renombrado', this.modoRenombrado);
      // ➕ Añadir último nivel seleccionado (si existe) para esta iteración del bucle
      const ultimo2 = this.getUltimoSeleccion();
      if (ultimo2) {
        switch (ultimo2.tipo) {
          case 'sala':
            formData.append('id_sala', String(ultimo2.id)); break;
          case 'estanteria':
            formData.append('id_estanteria', String(ultimo2.id)); break;
          case 'fila':
            formData.append('id_fila', String(ultimo2.id)); break;
          case 'caja':
            formData.append('id_caja', String(ultimo2.id)); break;
          case 'carpeta':
            formData.append('id_carpeta', String(ultimo2.id)); break;
        }
      }
      // Añadir id_edificio e id del último nivel seleccionado
      const ultimo = this.getUltimoSeleccion();
      if (this.selectedRuta?.edificio?.id) {
        formData.append('id_edificio', String(this.selectedRuta.edificio.id));
      }
      if (ultimo) {
        switch (ultimo.tipo) {
          case 'sala':
            formData.append('id_sala', String(ultimo.id)); break;
          case 'estanteria':
            formData.append('id_estanteria', String(ultimo.id)); break;
          case 'fila':
            formData.append('id_fila', String(ultimo.id)); break;
          case 'caja':
            formData.append('id_caja', String(ultimo.id)); break;
          case 'carpeta':
            formData.append('id_carpeta', String(ultimo.id)); break;
          // 'edificio' ya va en id_edificio
        }
      }

    try {
      // Usamos .toPromise() para mantener consistencia con tu otra función
      const resp: any = await this.seccionesService.subirDocumentosSerie(formData).toPromise();
      // El servicio usa observe:'events'; el body viene en resp.body
      const body: any = resp?.body ?? resp;
      if (Array.isArray(body?.errores) && body.errores.length > 0) {
        erroresAcumulados.push(...body.errores);
      }
    } catch (error) {
      console.error(`Error en archivo ${file.name}:`, error);
      errores.push(file.name);
    }
  }

  // 3. FINALIZACIÓN
  event.target.value = '';
  this.tipoDocSeleccionado = null;
  this.encriptarRuta = false;
  this.renombrarPorContenido = false;
  this.modoRenombrado = 'nombre';

  if (erroresAcumulados.length > 0) {
    // Aviso de documentos ya cargados (no se cierra hasta dar "Cerrar")
    const listaHtml = erroresAcumulados
      .map((e: any) => `<li><b>${e.archivo}</b>: ${e.error}</li>`)
      .join('');
    const subidos = totalArchivos - erroresAcumulados.length - errores.length;
    await Swal.fire({
      icon: 'warning',
      title: 'Algunos documentos no se subieron',
      html: `
        <div style="text-align:left;">
          <p>Se subieron <b>${subidos < 0 ? 0 : subidos}</b> de <b>${totalArchivos}</b> expedientes.</p>
          <p class="mb-1">Motivo por cada documento:</p>
          <ul style="max-height:200px; overflow:auto; padding-left:18px;">${listaHtml}</ul>
        </div>`,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#009ef7',
      allowOutsideClick: false,
      allowEscapeKey: false
    });
    // Refrescar DESPUÉS de cerrar el aviso (para que no lo cierre el Swal de la lista)
    this.listarDocumentosPorSerie();
    try { this.obtenerDatosRuta(); } catch {}
  } else {
    // Flujo normal (sin duplicados): refrescar y mostrar el resumen habitual
    this.listarDocumentosPorSerie();
    try { this.obtenerDatosRuta(); } catch {}
    this.mostrarResumenFinal(totalArchivos, errores);
  }
}

private mostrarResumenFinal(total: number, errores: string[]) {
  // Refrescamos la tabla de documentos para que el usuario vea lo nuevo
  this.listarDocumentosPorSerie();

  if (errores.length === 0) {
    // CASO DE ÉXITO TOTAL
    Swal.fire({
      icon: 'success',
      title: '¡Subida Completada!',
      text: `Se procesaron correctamente los ${total} archivos PDF.`,
      confirmButtonColor: '#28a745'
    });
  } else {
    // CASO CON ERRORES PARCIALES
    Swal.fire({
      icon: 'warning',
      title: 'Proceso finalizado con avisos',
      html: `
        <p>Se subieron <b>${total - errores.length}</b> de <b>${total}</b> archivos.</p>
        <div style="text-align: left; font-size: 0.85em; max-height: 150px; overflow-y: auto; background: #f8f9fa; padding: 10px; border: 1px solid #ddd;">
          <b class="text-danger">Archivos que fallaron:</b>
          <ul style="margin-top: 5px; margin-bottom: 0;">
            ${errores.map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>
        <p class="mt-2"><small>Revisa el tamaño de los archivos o tu conexión a internet.</small></p>
      `,
      confirmButtonColor: '#ffc107'
    });
  }
}


  listarDocumentosPorSerie(page: number = 1) {
  // 1. Guardamos la página que queremos cargar
  this.paginaActual = page;

  let idAEnviar: number | null = null;
  let parametro: string = '';

  // Determinamos si enviamos idSerie o idSubSerie
  if (this.idSubSerie !== null && this.idSubSerie !== undefined) {
    idAEnviar = this.idSubSerie;
    parametro = 'idSubserie';
  } 
  else if (this.idSerie !== null && this.idSerie !== undefined) {
    idAEnviar = this.idSerie;
    parametro = 'idSerie';
  }

  if (idAEnviar === null) {
    console.error('❌ No se pudo determinar Serie ni SubSerie');
    return;
  }

  // 2. Preparamos el payload para Laravel
  const payload: any = { 
    [parametro]: idAEnviar,
    page: this.paginaActual 
  };
  // Filtros por ubicación seleccionada
  if (this.selectedRuta?.edificio?.id) {
    payload.id_edificio = this.selectedRuta.edificio.id;
  }
  const ultimo = this.getUltimoSeleccion();
  if (ultimo) {
    switch (ultimo.tipo) {
      case 'sala':
        payload.id_sala = ultimo.id; break;
      case 'estanteria':
        payload.id_estanteria = ultimo.id; break;
      case 'fila':
        payload.id_fila = ultimo.id; break;
      case 'caja':
        payload.id_caja = ultimo.id; break;
      case 'carpeta':
        payload.id_carpeta = ultimo.id; break;
    }
  }

  // 3. Feedback visual al usuario
  Swal.fire({
    title: 'Cargando documentos...',
    text: `Obteniendo página ${this.paginaActual}...`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  // 4. Llamada al servicio
  this.seccionesService.listarDocumentosPorSerie(payload).subscribe({
    next: (resp: any) => {
      console.log('📥 RESPUESTA API:', resp);
      
      // Asignación de variables de paginación
      this.totalRegistros = Number(resp.total || 0);
      this.ultimaPagina = Number(resp.last_page || 1);
      this.paginaActual = Number(resp.current_page || 1);
  
      // 5. Procesamiento dinámico de los documentos
      this.documentos = (resp.documentos || []).map((doc: any) => {
        // --- LÓGICA ROBUSTA PARA VERIFICAR PARÁMETROS ---
        let tieneParametrosValidos = false;
        try {
          let arr: any = doc.parametros_indexados_values;
          if (typeof arr === 'string') {
            try { arr = JSON.parse(arr); } catch {}
          }
          if (typeof arr === 'string') {
            // Caso de doble serialización: parsear nuevamente
            try { arr = JSON.parse(arr); } catch {}
          }
          if (!Array.isArray(arr)) arr = [];

          // Verde SOLO si TODOS los parámetros tienen valor lleno
          tieneParametrosValidos = Array.isArray(arr) && arr.length > 0 && arr.every((p: any) => {
            const v = p?.valor;
            if (v === null || v === undefined) return false;
            if (typeof v === 'string') return v.trim() !== '';
            // números/booleanos se consideran válidos
            return true;
          });
        } catch {
          tieneParametrosValidos = false;
        }

        return {
          ...doc,
          seleccionado: false,
          peso_bytes: Number(doc.tamano_archivo || doc.size || 0),
          // Estado del OCR
          ocr_status: (doc.datos_ocr && doc.datos_ocr.toString().trim() !== '') ? 'INDEXADO' : 'NO INDEXADO',
          // Estado de Parámetros (Bandera Verde/Roja)
          param_status: tieneParametrosValidos ? 'INDEXADO' : 'NO INDEXADO'
        };
      });
  
      console.log(`✅ Página ${this.paginaActual} procesada. Registros: ${this.documentos.length}`);
      Swal.close();
    },
    error: (err) => {
      console.error('❌ Error al obtener documentos', err);
      this.documentos = [];
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los documentos de esta página'
      });
    }
  });
}

  // Eventos de hover para previsualizar la primera página
  onRowEnter(doc: any, ev: MouseEvent) {
    const id = Number(doc?.id || doc?.id_documento);
    if (!id || !this.id_empresa) return;
    // Posicionar CERCA DEL MOUSE
    const estimatedW = 160; // ancho estimado de preview
    const estimatedH = 150; // alto estimado de preview
    let x = ev.clientX + 16;
    let y = ev.clientY + 16;
    if (x + estimatedW + 8 > window.innerWidth) x = window.innerWidth - (estimatedW + 8);
    if (y + estimatedH + 8 > window.innerHeight) y = window.innerHeight - (estimatedH + 8);
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    this.previewX = Math.round(x);
    this.previewY = Math.round(y);
    this.positionPreview(this.previewX, this.previewY);
    this.previewVisible = true;
    this.ensurePreviewEl();
    if (this.previewCache[id]) {
      // Usar imagen cacheada inmediatamente
      const cached = this.previewCache[id];
      this.previewImage = cached;
      this.updatePreviewImage(cached);
      return;
    }
    const payload: any = {
      idDocumento: id,
      idEmpresa: this.id_empresa,
      idSerieSubserie: (doc?.id_serie_subserie ?? this.idSubSerie ?? this.idSerie) || null,
      page: 0
    };
    // Cancelar cualquier solicitud previa en curso
    if (this.previewSub) { this.previewSub.unsubscribe(); this.previewSub = null; }
    this.previewSub = this.seccionesService.obtenerDocumentoUrl(payload).subscribe({
      next: (resp: any) => {
        if (!this.previewVisible) { return; } // si ya salieron de la fila, ignorar
        if (resp?.success && resp.data?.imagen) {
          this.previewImage = resp.data.imagen;
          this.previewCache[id] = resp.data.imagen;
          this.updatePreviewImage(this.previewImage);
        }
      },
      error: () => { /* silencioso */ },
      complete: () => { this.previewSub = null; }
    });
    // Mientras carga, mostrar placeholder (si no hay cache)
    if (!this.previewCache[id]) {
      this.updatePreviewImage(null); // mostrará placeholder via CSS size
    }
  }

  onRowMove(ev: MouseEvent) {
    if (!this.previewVisible) return;
    // Seguir el cursor, con límites de viewport
    const estimatedW = 160;
    const estimatedH = 150;
    let x = ev.clientX + 16;
    let y = ev.clientY + 16;
    if (x + estimatedW + 8 > window.innerWidth) x = window.innerWidth - (estimatedW + 8);
    if (y + estimatedH + 8 > window.innerHeight) y = window.innerHeight - (estimatedH + 8);
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    this.previewX = Math.round(x);
    this.previewY = Math.round(y);
    this.positionPreview(this.previewX, this.previewY);
  }

  onRowLeave() {
    this.previewVisible = false;
    this.hidePreview();
    // Cancelar llamada en curso si existe
    if (this.previewSub) { this.previewSub.unsubscribe(); this.previewSub = null; }
  }

  private ensurePreviewEl() {
    if (this.previewEl) {
      this.previewEl.style.display = 'block';
      return;
    }
    const el = this.renderer.createElement('div') as HTMLDivElement;
    this.renderer.addClass(el, 'hover-preview');
    this.renderer.setStyle(el, 'position', 'fixed');
    this.renderer.setStyle(el, 'z-index', '2000');
    this.renderer.setStyle(el, 'background', '#fff');
    this.renderer.setStyle(el, 'border', '1px solid rgba(0,0,0,0.1)');
    this.renderer.setStyle(el, 'box-shadow', '0 6px 24px rgba(0,0,0,0.15)');
    this.renderer.setStyle(el, 'border-radius', '8px');
    this.renderer.setStyle(el, 'padding', '6px');
    this.renderer.setStyle(el, 'pointer-events', 'none');
    const img = this.renderer.createElement('img') as HTMLImageElement;
    this.renderer.setStyle(img, 'display', 'none');
    this.renderer.setStyle(img, 'max-width', '160px');
    this.renderer.setStyle(img, 'max-height', '140px');
    this.renderer.setStyle(img, 'border-radius', '4px');
    const ph = this.renderer.createElement('div') as HTMLDivElement;
    this.renderer.setStyle(ph, 'width', '120px');
    this.renderer.setStyle(ph, 'height', '80px');
    this.renderer.setStyle(ph, 'display', 'grid');
    (ph.style as any).placeItems = 'center';
    this.renderer.setStyle(ph, 'color', '#6c757d');
    this.renderer.setStyle(ph, 'font-size', '12px');
    ph.textContent = 'Cargando...';
    el.appendChild(img);
    el.appendChild(ph);
    document.body.appendChild(el);
    this.previewEl = el;
    this.previewImgEl = img;
    this.previewPlaceholderEl = ph;
  }

  private positionPreview(x: number, y: number) {
    if (!this.previewEl) return;
    this.previewEl.style.left = `${x}px`;
    this.previewEl.style.top = `${y}px`;
  }

  private updatePreviewImage(src: string | null) {
    if (!this.previewEl) return;
    this.ensurePreviewEl();
    if (!this.previewImgEl || !this.previewPlaceholderEl) return;
    if (src) {
      try {
        const testImg = new Image();
        testImg.onload = () => {
          if (!this.previewEl || !this.previewImgEl || !this.previewVisible) return;
          this.previewImgEl.src = src;
          this.previewImgEl.style.display = 'block';
          this.previewPlaceholderEl!.style.display = 'none';
        };
        testImg.onerror = () => {
          if (!this.previewEl || !this.previewPlaceholderEl) return;
          this.previewImgEl!.removeAttribute('src');
          this.previewImgEl!.style.display = 'none';
          this.previewPlaceholderEl.style.display = 'grid';
          this.previewPlaceholderEl.textContent = 'Sin vista';
        };
        testImg.src = src;
      } catch {
        this.previewImgEl.removeAttribute('src');
        this.previewImgEl.style.display = 'none';
        this.previewPlaceholderEl.style.display = 'grid';
        this.previewPlaceholderEl.textContent = 'Sin vista';
      }
    } else {
      this.previewImgEl.removeAttribute('src');
      this.previewImgEl.style.display = 'none';
      this.previewPlaceholderEl.style.display = 'grid';
    }
  }

  private hidePreview() {
    if (this.previewEl) {
      this.previewEl.style.display = 'none';
    }
  }

  // Ir a la página indicada en el input (enter)
  irAPagina() {
    if (this.jumpPage === null || isNaN(this.jumpPage as any)) return;
    let destino = Math.floor(Number(this.jumpPage));
    if (destino < 1) destino = 1;
    if (destino > this.ultimaPagina) destino = this.ultimaPagina;
    this.listarDocumentosPorSerie(destino);
  }




async subirPdfSimple(fileInput: HTMLInputElement) {
  const files = fileInput.files;
  
  // 1. Validación inicial de archivos
  if (!files || files.length === 0) {
    console.error('❌ No hay archivos seleccionados');
    return;
  }
if (!this.selectedRuta?.edificio?.id) {
    fileInput.value = ''; // Limpiamos la selección
    Swal.fire({
      icon: 'warning',
      title: 'Ubicación incompleta',
      text: 'Por favor, selecciona al menos el Edificio antes de seleccionar archivos.',
      confirmButtonColor: '#3085d6'
    });
    return; // AQUÍ SE DETIENE LA FUNCIÓN
  }

  // 3. Solicitar tipo de documento
  const tipoSel = await this.solicitarTipoDocumento();
  if (!tipoSel) { fileInput.value = ''; return; }
  this.tipoDocSeleccionado = tipoSel.tipo;
  this.encriptarRuta = tipoSel.encriptar;

  // 4. ✅ USUARIO LOGEADO
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  console.log('👤 USER LOCALSTORAGE:', user);

  if (!user || !user.id) {
    console.error('❌ NO HAY USER.ID EN LOCALSTORAGE');
    return;
  }

  const usuario_id = String(user.id);
  console.log('✅ ID USUARIO DETECTADO:', usuario_id);

  const formData = new FormData();

  // 5. ✅ ARCHIVOS
  for (let i = 0; i < files.length; i++) {
    formData.append('documentos[]', files[i]);
  }

  // 6. ✅ SUBSERIE / SERIE
  if (this.idSubSerie) {
    formData.append('id_subserie', String(this.idSubSerie));
  } else if (this.idSerie) {
    formData.append('id_serie', String(this.idSerie));
  } else {
    console.warn('⚠️ NO HAY ID SERIE NI SUBSERIE');
  }

  // 7. ✅ EMPRESA
  if (this.id_empresa) {
    formData.append('id_empresa', String(this.id_empresa));
  } else {
    console.warn('⚠️ NO HAY ID EMPRESA');
  }

  // 8. ✅ USUARIO (CORRECTO: usuario_id para coincidir con el backend)
  formData.append('usuario_id', usuario_id);
  
  // 9. ✅ Tipo de documento
  if (this.tipoDocSeleccionado) formData.append('tipo_documento', this.tipoDocSeleccionado);
  // Guardar la ruta cifrada en la base de datos (opcional, se marca en el modal)
  formData.append('encriptar_ruta', this.encriptarRuta ? '1' : '0');
  // Renombrar el PDF con el nombre de la persona (hojas de vida)
  formData.append('renombrar_por_contenido', this.renombrarPorContenido ? '1' : '0');
  formData.append('modo_renombrado', this.modoRenombrado);

  // 10. ➕ Agregar id_edificio y último nivel seleccionado
  if (this.selectedRuta?.edificio?.id) {
    formData.append('id_edificio', String(this.selectedRuta.edificio.id));
  }

  // Añadir id_lugar si se pasó al modal
  if (this.idLugarRuta) {
    formData.append('id_lugar', String(this.idLugarRuta));
  }

  const ultimo1 = this.getUltimoSeleccion();
  console.log('🔍 ¿Qué tiene ultimo1?', ultimo1);
  
  if (ultimo1) {
    switch (ultimo1.tipo) {
      case 'sala': formData.append('id_sala', String(ultimo1.id)); break;
      case 'estanteria': formData.append('id_estanteria', String(ultimo1.id)); break;
      case 'fila': formData.append('id_fila', String(ultimo1.id)); break;
      case 'caja': formData.append('id_caja', String(ultimo1.id)); break;
      case 'carpeta': formData.append('id_carpeta', String(ultimo1.id)); break;
    }
  } else {
    console.warn('⚠️ ultimo1 es null o undefined, por eso no se agregan los id_... al FormData');
  }

  // 11. 👀 VER TODO LO QUE SE ENVÍA
  console.log('📦 FORM DATA ENVIADO:');
  formData.forEach((value, key) => {
    console.log(key + ' => ', value);
  });

  // 12. Envío al servicio
  this.seccionesService.subirDocumentosSerie(formData).subscribe({
    next: (event: any) => {
      // observe:'events' => solo procesamos la respuesta final
      if (event?.type !== HttpEventType.Response) { return; }
      const resp: any = event.body ?? {};
      console.log('✅ RESPUESTA BACKEND:', resp);
      fileInput.value = '';
      this.tipoDocSeleccionado = null;
      this.encriptarRuta = false;
      this.renombrarPorContenido = false;
  this.modoRenombrado = 'nombre';

      const errores: any[] = Array.isArray(resp?.errores) ? resp.errores : [];
      // Refrescar la lista/árbol DESPUÉS de que el usuario cierre el aviso
      // (listarDocumentosPorSerie abre su propio Swal y cerraría este)
      const refrescar = () => {
        this.listarDocumentosPorSerie();
        try { this.obtenerDatosRuta(); } catch {}
      };

      if (errores.length > 0) {
        // Documentos que no se subieron (ya cargados en otra serie/ubicación)
        const listaHtml = errores
          .map((e: any) => `<li><b>${e.archivo}</b>: ${e.error}</li>`)
          .join('');
        Swal.fire({
          icon: 'warning',
          title: 'Algunos documentos no se subieron',
          html: `
            <div style="text-align:left;">
              <p class="mb-1">Motivo por cada documento:</p>
              <ul style="max-height:200px; overflow:auto; padding-left:18px;">${listaHtml}</ul>
            </div>`,
          confirmButtonText: 'Cerrar',
          confirmButtonColor: '#009ef7',
          allowOutsideClick: false,
          allowEscapeKey: false
        }).then(() => refrescar());
      } else {
        Swal.fire('Éxito', 'Documentos subidos correctamente', 'success').then(() => refrescar());
      }
    },
    error: (err) => {
      console.error('❌ ERROR BACKEND:', err);
      Swal.fire('Error', 'No se pudo subir el documento', 'error');
    }
  });
}






// cuando selecciona los archivos
  async handleFileSelection(event: any, tipo: string) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    // Solicitar SIEMPRE el tipo de documento
    const tipoSel = await this.solicitarTipoDocumento();
    if (!tipoSel) { event.target.value = ''; return; }
    this.tipoDocSeleccionado = tipoSel.tipo;
    this.encriptarRuta = tipoSel.encriptar;
    this.renombrarPorContenido = tipoSel.renombrar;
    this.modoRenombrado = tipoSel.modo;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const usuario_id = user.id || user.usuario_id || null;
  const id_empresa = user.id_empresa || this.id_empresa || null;
  const totalArchivos = files.length;

  // 1. Abrimos el modal UNA SOLA VEZ al inicio
  Swal.fire({
    title: 'Subida Masiva en Progreso',
    html: `Preparando carga secuencial...<br><b>0 de ${totalArchivos} procesados</b>`,
    allowOutsideClick: false,
    allowEscapeKey: false, // Evita que lo cierren con ESC
    showConfirmButton: false, // Ocultamos el botón OK para que no lo cierren
    didOpen: () => {
      Swal.showLoading();
    }
  });

    // Acumular documentos que ya existen en otra serie (para avisar al final)
    const erroresAcumulados: any[] = [];

    for (let i = 0; i < totalArchivos; i++) {
      const file = files[i];
      const formData = new FormData();

      formData.append('documentos[]', file);
      if (this.idSubSerie) formData.append('id_subserie', String(this.idSubSerie));
      else if (this.idSerie) formData.append('id_serie', String(this.idSerie));
      // id_edificio (opcional) desde la ruta seleccionada
      if (this.selectedRuta?.edificio?.id) {
        formData.append('id_edificio', String(this.selectedRuta.edificio.id));
      }
      
      if (id_empresa) formData.append('id_empresa', String(id_empresa));
      if (usuario_id) formData.append('usuario_id', String(usuario_id));
      // Añadir id_lugar si está disponible
      if (this.idLugarRuta) formData.append('id_lugar', String(this.idLugarRuta));
      formData.append('tipo_subida', tipo);
      // Nuevo: tipo de documento (Digital / Electrónico)
      if (this.tipoDocSeleccionado) formData.append('tipo_documento', this.tipoDocSeleccionado);
      // Guardar la ruta cifrada en la base de datos (opcional, se marca en el modal)
      formData.append('encriptar_ruta', this.encriptarRuta ? '1' : '0');
      // Renombrar el PDF con el nombre de la persona (hojas de vida)
      formData.append('renombrar_por_contenido', this.renombrarPorContenido ? '1' : '0');
      formData.append('modo_renombrado', this.modoRenombrado);
      // Añadir el último nivel seleccionado para esta subida
      const ultimoSel = this.getUltimoSeleccion();
      if (ultimoSel) {
        switch (ultimoSel.tipo) {
          case 'sala':
            formData.append('id_sala', String(ultimoSel.id)); break;
          case 'estanteria':
            formData.append('id_estanteria', String(ultimoSel.id)); break;
          case 'fila':
            formData.append('id_fila', String(ultimoSel.id)); break;
          case 'caja':
            formData.append('id_caja', String(ultimoSel.id)); break;
          case 'carpeta':
            formData.append('id_carpeta', String(ultimoSel.id)); break;
        }
      }

    // 2. ACTUALIZAMOS el modal existente sin cerrarlo
    Swal.update({
      html: `
        <div style="text-align: left; margin-top: 10px;">
          <p>Archivo actual: <b>${file.name}</b> (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>
          <p>Progreso: <b>${i + 1} de ${totalArchivos}</b></p>
          <div class="progress" style="height: 10px;">
            <div class="progress-bar progress-bar-striped progress-bar-animated" 
                 role="progressbar" 
                 style="width: ${((i + 1) / totalArchivos) * 100}%">
            </div>
          </div>
        </div>
      `
    });

    try {
      // Usamos lastValueFrom (si usas Angular 12+) o toPromise
      const resp: any = await this.seccionesService.subirDocumentosSerie(formData).toPromise();
      // El servicio usa observe:'events', así que el body viene en resp.body
      const body: any = resp?.body ?? resp;
      // Acumular documentos que el backend rechazó (ej: ya cargados en otra serie/ubicación)
      if (Array.isArray(body?.errores) && body.errores.length > 0) {
        erroresAcumulados.push(...body.errores);
      }
      console.log(`✅ ${file.name} procesado.`);
    } catch (error) {
      console.error(`❌ Error en ${file.name}`, error);
      // En lugar de un alert que rompe el flujo, podrías registrar el error
      // y mostrar un resumen al final, así el modal no desaparece.
    }
  }

  // 3. Cuando el bucle TERMINA, mostramos el resumen (esperando a que lo cierren)
  event.target.value = '';
  this.tipoDocSeleccionado = null;
  this.encriptarRuta = false;
  this.renombrarPorContenido = false;
  this.modoRenombrado = 'nombre';

  const subidos = totalArchivos - erroresAcumulados.length;

  if (erroresAcumulados.length > 0) {
    // Listado de documentos que no se subieron (con su motivo)
    const listaHtml = erroresAcumulados
      .map((e: any) => `<li><b>${e.archivo}</b>: ${e.error}</li>`)
      .join('');
    await Swal.fire({
      icon: 'warning',
      title: 'Algunos documentos no se subieron',
      html: `
        <div style="text-align:left;">
          <p>Se subieron <b>${subidos}</b> de <b>${totalArchivos}</b> expedientes.</p>
          <p class="mb-1">Motivo por cada documento:</p>
          <ul style="max-height:200px; overflow:auto; padding-left:18px;">${listaHtml}</ul>
        </div>`,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#009ef7',
      allowOutsideClick: false,
      allowEscapeKey: false
    });
  } else {
    await Swal.fire({
      icon: 'success',
      title: '¡Todo listo!',
      text: `Se completó la subida de los ${totalArchivos} expedientes.`,
      confirmButtonColor: '#28a745'
    });
  }

  // Refrescar la lista y el árbol DESPUÉS de cerrar el aviso
  // (listarDocumentosPorSerie abre su propio Swal, por eso va al final)
  this.listarDocumentosPorSerie();
  try { this.obtenerDatosRuta(); } catch {}
}


  // Ver las versiones (V1, V2, V3...) de un documento
  verVersiones(doc: any) {
    const modalRef = this.modalService.open(DocumentoVersionComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static'
    });
    modalRef.componentInstance.documento = doc;
    modalRef.componentInstance.idSerie = this.idSerie;
    modalRef.componentInstance.idSubSerie = this.idSubSerie;
    modalRef.componentInstance.idEmpresa = this.id_empresa;
  }

  verDocumento(doc: any) {
    // Abrimos el visor con el servicio global (plantilla reutilizable)
    const modalRef = this.documentoViewer.abrirVer({
      idDocumento: doc.id,
      idEmpresa: this.id_empresa,
      idSerieSubserie: this.idSubSerie
    });
    // Si el visor guardó una nueva versión, refrescar la lista y el árbol
    modalRef.result.then((res) => {
      if (res && res.accion === 'nueva_version') {
        this.listarDocumentosPorSerie();
        try { this.obtenerDatosRuta(); } catch {}
      }
    }).catch(() => {});
  }

  /**
   * Descarga el PDF del expediente. Antes pide la contraseña del usuario
   * logueado: hay 3 intentos y, si se agotan, se cierra la sesión.
   * El backend valida la contraseña y descifra el archivo si hacía falta.
   */
  async descargarDocumento(doc: any) {
    const MAX_INTENTOS = 3;

    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      const { value: password } = await Swal.fire<string>({
        title: 'Contraseña requerida',
        html: `
          <div class="text-start">
            <p class="fs-7 text-gray-700 mb-3">
              Para descargar <b>${doc?.nombre || 'el expediente'}</b> ingrese la contraseña de su usuario.
            </p>
            <div class="badge badge-light-${intento === 1 ? 'primary' : 'danger'} fs-8 fw-bold">
              Intento ${intento} de ${MAX_INTENTOS}
            </div>
          </div>
        `,
        input: 'password',
        inputPlaceholder: 'Contraseña',
        inputAttributes: { autocapitalize: 'off', autocomplete: 'current-password' },
        showCancelButton: true,
        confirmButtonText: 'Descargar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#009ef7',
        allowOutsideClick: false,
        preConfirm: (valor: string) => {
          if (!valor) {
            Swal.showValidationMessage('Ingrese su contraseña');
            return null as any;
          }
          return valor;
        }
      });

      if (!password) { return; } // canceló

      Swal.fire({
        title: 'Preparando la descarga...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const respuesta: Blob = await firstValueFrom(
          this.seccionesService.descargarDocumento({
            id_documento: doc.id,
            usuario_id: this.usuario_id,
            password,
            // Se envían para que la auditoría registre en qué intento va
            intento,
            max_intentos: MAX_INTENTOS
          })
        ) as Blob;

        Swal.close();
        this.guardarArchivoDescargado(respuesta, doc?.nombre);
        return; // descarga correcta

      } catch (err: any) {
        Swal.close();

        // Contraseña incorrecta: se consume un intento
        if (err?.status === 403) {
          const restantes = MAX_INTENTOS - intento;

          if (restantes > 0) {
            await Swal.fire({
              icon: 'error',
              title: 'Contraseña incorrecta',
              text: `Le ${restantes === 1 ? 'queda' : 'quedan'} ${restantes} ${restantes === 1 ? 'intento' : 'intentos'}.`,
              confirmButtonColor: '#009ef7'
            });
            continue; // vuelve a pedirla
          }

          await Swal.fire({
            icon: 'warning',
            title: 'Sesión cerrada',
            text: 'Se agotaron los 3 intentos. Por seguridad se cerrará su sesión.',
            confirmButtonColor: '#f1416c',
            allowOutsideClick: false
          });

          // Cerrar los modales abiertos antes de salir: si no, la ventana del
          // expediente queda flotando encima de la pantalla de login
          try { this.modalService.dismissAll(); } catch {}
          try { this.activeModal.dismiss(); } catch {}
          Swal.close();

          this.authService.logout();
          return;
        }

        // Cualquier otro error (archivo inexistente, problema de servidor...)
        let mensaje = 'No se pudo descargar el documento.';
        try {
          const texto = await err?.error?.text?.(); // el error viene como blob
          if (texto) { mensaje = JSON.parse(texto)?.message || mensaje; }
        } catch {}
        console.error('Error descargando documento:', err);
        await Swal.fire('Error', mensaje, 'error');
        return;
      }
    }
  }

  /** Dispara la descarga del archivo recibido, sin abrir otra pestaña */
  private guardarArchivoDescargado(respuesta: Blob, nombre?: string) {
    // Se fuerza el tipo PDF: sin él, algunos navegadores abren el archivo
    // en una pestaña en vez de guardarlo
    const blob = new Blob([respuesta], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre || 'documento.pdf';
    enlace.target = '_self';
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    // Liberar el enlace después, no en el acto: si se revoca de inmediato
    // hay navegadores que cancelan la descarga a medias
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  }

  compartirDocumento(doc: any) {
    // Modal con opciones de duración
    Swal.fire({
      title: 'Compartir enlace (solo lectura)',
      html: `
        <div class="text-start">
          <label class="form-label">Duración del enlace</label>
          <select id="duracion" class="form-select">
            <option value="1440">1 día</option>
            <option value="10080" selected>7 días</option>
            <option value="43200">30 días</option>
            <option value="129600">90 días</option>
            <option value="0">Indefinido</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Generar enlace',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const sel = (document.getElementById('duracion') as HTMLSelectElement);
        return sel ? Number(sel.value) : 10080; // 7 días por defecto
      }
    }).then((res) => {
      if (!res.isConfirmed) return;
      const minutos = Number(res.value || 10080);
      // usuario_id e id_empresa se envían para la auditoría del enlace
      const payload = { idDocumento: doc.id, minutos, usuario_id: this.usuario_id, id_empresa: this.id_empresa } as any;
      this.seccionesService.generarLinkCompartir(payload).subscribe({
        next: (resp: any) => {
          if (resp?.success && resp?.url) {
            // Mostrar enlace y botón copiar
            const url = resp.url as string;
            Swal.fire({
              title: 'Enlace generado',
              html: `
                <div class="input-group">
                  <input id="linkCompartir" class="form-control" value="${url}" readonly />
                  <button id="copyBtn" class="btn btn-primary">Copiar</button>
                </div>
                <div class="text-muted mt-2 small">Puedes compartir este enlace. Solo lectura.</div>
              `,
              didOpen: () => {
                const btn = document.getElementById('copyBtn');
                const inp = document.getElementById('linkCompartir') as HTMLInputElement;
                if (btn && inp) {
                  btn.addEventListener('click', async () => {
                    try { await navigator.clipboard.writeText(inp.value); btn.textContent = 'Copiado'; } catch {}
                  });
                }
              }
            });
          } else {
            Swal.fire('Aviso', resp?.message || 'No se pudo generar el enlace', 'info');
          }
        },
        error: (err) => {
          console.error('Error al generar enlace', err);
          Swal.fire('Error', 'No se pudo generar el enlace', 'error');
        }
      });
    });
  }


verDocumentoFirmado(doc: any) {
  const payload = {
    idDocumento: doc.id,
    idEmpresa: this.id_empresa,
    idSerieSubserie: this.idSubSerie
  };

  this.seccionesService.obtenerDocumentoFirmadoPorId(payload).subscribe({
    next: (resp: any) => {
      if (resp.success && resp.data?.ruta) {
        this.documentoViewer.abrirVer({ rutaDocumento: resp.data.ruta });
      } else {
        this.toast.error('No se pudo obtener el documento.');
      }
    },
    error: (err) => {
      console.error('Error al traer documento:', err);
      this.toast.error('Error al obtener el documento.');
    }
  });
}



indexarDocumento(doc: any) {
  const modalRef = this.modalService.open(IndexarDocumentoComponent, {
    size: 'xl',
    centered: true,
    backdrop: 'static'
  });

  // ✅ ENVIAMOS el ID del documento
  modalRef.componentInstance.idDocumento = doc.id;

  // 🌟 Serie del documento: this.idSubSerie queda en null cuando se entra
  // directo por una serie, así que primero se usa la del propio documento
  modalRef.componentInstance.idSerieSubserie =
    doc?.id_serie_subserie ?? this.idSubSerie ?? this.idSerie ?? null;

  // 🌟 AÑADIDO: Enviamos ID_EMPRESA (asumiendo que es this.id_empresa)
  modalRef.componentInstance.ID_EMPRESA = this.id_empresa;

  // 👇 AQUÍ ESTÁ LA MAGIA
  modalRef.result.then((res) => {
    if (res === true) {
      this.listarDocumentosPorSerie(); // 🔥 RECARGA LA TABLA
    }
  }).catch(() => {});
}


subirAnexos(doc: any) {
  const modalRef = this.modalService.open(SubirAnexosComponent, {
    size: 'xl',
    centered: true,
    backdrop: 'static'
  });

  // ✅ ENVIAMOS el ID del documento
  modalRef.componentInstance.idDocumento = doc.id;
  modalRef.componentInstance.rutaDocumento = doc.ruta_completa;
  modalRef.componentInstance.nombreDocumento = doc.nombre;
  // 🌟 AÑADIDO: Enviamos idSerieSubserie (asumiendo que es this.idSubSerie)
  modalRef.componentInstance.idSerieSubserie = this.idSubSerie;

  // 🌟 AÑADIDO: Enviamos ID_EMPRESA (asumiendo que es this.id_empresa)
  modalRef.componentInstance.ID_EMPRESA = this.id_empresa;

  // 👇 AQUÍ ESTÁ LA MAGIA
  modalRef.result.then((res) => {
    if (res === true) {
      this.listarDocumentosPorSerie(); // 🔥 RECARGA LA TABLA
    }
  }).catch(() => {});
}



DocumentoUrl(doc: any) {
  const payload = {
    idDocumento: doc.id,
    idEmpresa: this.id_empresa,
    idSerieSubserie: this.idSubSerie
  };

  this.seccionesService.obtenerDocumentoPorId(payload).subscribe({
    next: (resp: any) => {
      if (resp.success && resp.data?.ruta) {
        const modalRef = this.modalService.open(IndexarDocumentoComponent, {
          size: 'xl',
          centered: true
        });
        // Pasamos también IDs requeridos por el componente de indexación
        modalRef.componentInstance.rutaDocumento = resp.data.ruta;
        modalRef.componentInstance.idDocumento = doc.id;
        modalRef.componentInstance.idSerieSubserie = this.idSubSerie;
        modalRef.componentInstance.idEmpresa = this.id_empresa;
        console.log('📂 rutaDocumento asignada al modal:', resp.data.ruta);
      } else {
        this.toast.error('No se pudo obtener el documento.');
      }
    },
    error: (err) => {
      console.error('Error al traer documento:', err);
      this.toast.error('Error al obtener el documento.');
    }
  });
}






ingresarInformacion(doc: any) {

  const modalRef = this.modalService.open(IngresarInformacionComponent, {
    size: 'xl',
    centered: true,
    backdrop: 'static',
    windowClass: 'modal-fijo' // opcional
  });

  modalRef.componentInstance.idDocumento   = doc.id;
  modalRef.componentInstance.idSerieSubserie = this.idSubSerie;
  modalRef.componentInstance.ID_EMPRESA    = this.id_empresa;

  modalRef.result.then((res) => {
    if (res === true) {
      this.listarDocumentosPorSerie();
    }
  }).catch(() => {});
}





PermisosSubSerie(idUser: number, idActual: number) {
  console.log('Ejecutando PermisosSubSerie con ID usuario:', idUser, 'y ID actual:', idActual);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  this.seccionesService.permisosUsuario(idUser.toString()).subscribe({
    next: (resp: any) => {
      console.log('Permisos recibidos:', resp);

      this.permisosDocumentales = resp.permissions || [];

      // Depuración: imprimir un resumen de los IDs y tipos que llegan
      try {
        console.log('%c[Permisos][Resumen] cantidad:', 'color:#198754', this.permisosDocumentales.length);
        const resumen = this.permisosDocumentales.slice(0, 10).map((p: any) => ({
          id_seccion: p?.id_seccion,
          id_serie: p?.id_serie,
          id_subserie: p?.id_subserie,
          subir_documentos: p?.subir_documentos,
          tipos: {
            id_seccion: typeof p?.id_seccion,
            id_serie: typeof p?.id_serie,
            id_subserie: typeof p?.id_subserie,
            subir_documentos: typeof p?.subir_documentos,
          }
        }));
        console.table(resumen);
      } catch {}

      // 🔹 Buscar el permiso que coincida con el ID actual
      const permisoActual = this.permisosDocumentales.find(p => p.id_serie === idActual || p.id_subserie === idActual);

      if (!permisoActual) {
        console.warn('[Permisos] No se encontró permiso para el ID actual:', idActual, '| tipo:', typeof idActual);
        // Diagnóstico extra: ¿hay coincidencias por string?
        try {
          const matchString = this.permisosDocumentales.find(p => String(p.id_serie) === String(idActual) || String(p.id_subserie) === String(idActual));
          if (matchString) {
            console.warn('[Permisos][Hint] Existe match si se castea a string. Tipos originales:', {
              id_serie: typeof matchString.id_serie,
              id_subserie: typeof matchString.id_subserie,
              idActual: typeof idActual
            });
          }
          const porSeccion = this.permisosDocumentales.filter(p => p.id_seccion != null);
          if (porSeccion.length && !matchString) {
            console.warn('[Permisos][Hint] Los permisos parecen venir a nivel de sección (id_seccion) y no por serie/subserie.');
          }
        } catch {}
        this.mostrarBotonSubirDocumentos = false;
        console.log('[Permisos] mostrarBotonSubirDocumentos =', this.mostrarBotonSubirDocumentos);
        return;
      }

      // 🔹 Identificar si es Serie o Subserie
      const tipo = permisoActual.id_serie === idActual ? 'Serie' : 'Subserie';
      console.log(`ID actual: ${idActual} | Tipo: ${tipo} | Permisos:`, permisoActual);

      // 🔹 Aplicar permisos
      this.puedeCrearSubSerie = permisoActual.crear || false;
      this.puedeEditarSubSerie = permisoActual.editar || false;
      this.puedeEliminarSubSerie = permisoActual.eliminar || false;
      this.puedeVerSubSerie = permisoActual.ver || false;
      this.puedeBuscarSubSerie = permisoActual.buscar || false;
      this.puedeSubirDocumentosSubSerie = permisoActual.subir_documentos || false;
      this.puedeVerDocumentoSubSerie = permisoActual.ver_documento || false;
      this.puedeRegistrarDatosSubSerie = permisoActual.registrar_datos || false;
      this.puedeIndexarSubSerie = permisoActual.indexar || false;
      this.puedeIndexarMasivoSubSerie = permisoActual.indexar_masivo || false;
      this.puedeSubirExcelSubSerie = permisoActual.subir_excel || false;
      this.puedeControlCalidadSubSerie = permisoActual.controlo_calidad || false;
      this.puedeEliminarDocumentoSubSerie = permisoActual.eliminar_documento || false;
      this.puedeFirmarDocumentoSubSerie = permisoActual.firmar_documento || false;
      this.puedeLimpiarDocumentoSubSerie = permisoActual.limpiar_documento || false;

      // 🔹 Mostrar botón según permiso
      this.mostrarBotonSubirDocumentos = this.puedeSubirDocumentosSubSerie;
      console.log('[Permisos] mostrarBotonSubirDocumentos =', this.mostrarBotonSubirDocumentos, '| puedeSubirDocumentosSubSerie =', this.puedeSubirDocumentosSubSerie);

      console.log('Permisos aplicados para el ID actual:', {
        tipo,
        crear: this.puedeCrearSubSerie,
        editar: this.puedeEditarSubSerie,
        eliminar: this.puedeEliminarSubSerie,
        ver: this.puedeVerSubSerie,
        buscar: this.puedeBuscarSubSerie,
        subir_documentos: this.puedeSubirDocumentosSubSerie,
        ver_documento: this.puedeVerDocumentoSubSerie,
        registrar_datos: this.puedeRegistrarDatosSubSerie,
        indexar: this.puedeIndexarSubSerie,
        indexar_masivo: this.puedeIndexarMasivoSubSerie,
        eliminar_documento: this.puedeEliminarDocumentoSubSerie,
        firmar_documento: this.puedeFirmarDocumentoSubSerie,
        limpiar_documento: this.puedeLimpiarDocumentoSubSerie
      });

      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error permisos Subserie', err);
      this.cdr.detectChanges();
      // 🔹 Reset permisos
      this.puedeCrearSubSerie = false;
      this.puedeEditarSubSerie = false;
      this.puedeEliminarSubSerie = false;
      this.puedeVerSubSerie = false;
      this.puedeBuscarSubSerie = false;
      this.puedeSubirDocumentosSubSerie = false;
      this.puedeVerDocumentoSubSerie = false;
      this.puedeRegistrarDatosSubSerie = false;
      this.puedeIndexarSubSerie = false;
      this.puedeIndexarMasivoSubSerie = false;
      this.puedeSubirExcelSubSerie = false;
      this.puedeControlCalidadSubSerie = false;
      this.puedeEliminarDocumentoSubSerie = false;
      this.puedeFirmarDocumentoSubSerie = false;
      this.puedeLimpiarDocumentoSubSerie = false;
      this.mostrarBotonSubirDocumentos = false;
    }
  });
}






abrirModalOCR(id?: any) {
  // 1. VALIDACIÓN: ¿Hay edificio seleccionado? (El "Candado")
  if (!this.selectedRuta?.edificio?.id) {
    Swal.fire({
      icon: 'warning',
      title: 'Ubicación incompleta',
      text: 'Para realizar el OCR, primero debes seleccionar una ubicación (al menos el Edificio).',
      confirmButtonColor: '#3085d6'
    });
    return; // Detiene la ejecución, el modal no se abrirá
  }

  // 2. Preparar los datos de ubicación
  const ultimo = this.getUltimoSeleccion();
  
  const modalRef = this.modalService.open(HacerOcrComponent, {
    size: 'xl',
    centered: true,
    backdrop: 'static'
  });

  // 3. ENVIAR DATOS AL MODAL
  modalRef.componentInstance.idSerie = this.idSeriePadre; 
  modalRef.componentInstance.idSubSerie = id ? id : this.idSubSerie;
  modalRef.componentInstance.ID_EMPRESA = this.id_empresa;
  modalRef.componentInstance.rutaCompleta = this.selectedRuta;
  // Enviamos la jerarquía completa
  modalRef.componentInstance.id_edificio = this.selectedRuta.edificio.id;
  
  // Enviamos el último nivel dinámico (ej: id_sala, id_caja, etc.)
  if (ultimo) {
    modalRef.componentInstance.tipoNivel = ultimo.tipo; // ej: 'sala'
    modalRef.componentInstance.idNivel = ultimo.id;     // ej: 123
  }

  modalRef.result.then((res) => {
    if (res === true) {
      this.listarDocumentosPorSerie();
    }
  }).catch(() => {});
}


  abrirModalOCRIA(id?: any) {
    // Validación: requiere clave de ChatGPT configurada en el usuario
    try {
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : (this as any).authService?.user || null;
      const clave = user?.clave_chatGPT || user?.clave_chatgpt || null;
      if (!clave || String(clave).trim() === '') {
        Swal.fire({
          icon: 'warning',
          title: 'Sin clave de ChatGPT',
          text: 'No tiene configurada la clave de ChatGPT para utilizar la Indexación IA.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
    } catch {}

    const modalRef = this.modalService.open(HacerOcrIAComponent, {
      size: 'xl',
      centered: true,
      backdrop: 'static'
    });

  // ENVIAR LOS IDS CORRECTAMENTE:
  // Si 'id' viene por parámetro lo usamos, si no, usamos los del componente padre
  modalRef.componentInstance.idSerie = this.idSeriePadre; 
  modalRef.componentInstance.idSubSerie = id ? id : this.idSubSerie;
  modalRef.componentInstance.ID_EMPRESA = this.id_empresa;

    modalRef.result.then((res) => {
      if (res === true) {
        this.listarDocumentosPorSerie();
      }
    }).catch(() => {});
  }



/** //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 * PASO 2: Ejecución del proceso pesado (OCR + IA)
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////*/

confirmarIndexacionIA(idSerie: number) {
  // 1. Validación previa: Verificar si hay documentos en el arreglo
  if (!this.documentos || this.documentos.length === 0) {
    Swal.fire({
      title: 'Sin documentos',
      text: 'No se encontraron documentos cargados para procesar. Debe haber al menos un documento para ejecutar el Indexacion.',
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3085d6',
    });
    return; // Detenemos la ejecución aquí
  }

  // 2. Si hay documentos, procedemos con la confirmación original
  Swal.fire({
    title: '¿Está seguro de realizar Indexación con Inteligencia Artificial?',
    text: "Una vez ejecutado, no podrá detener el proceso de Indexación a los expedientes.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, ejecutar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      this.indexacionOCRIA(idSerie);
    }
  });
}

async indexacionOCRIA(idSerie: number | null) {
  if (!idSerie || !this.documentos.length) return;

  const pendientes = this.documentos.filter(d => d.estado_indexacion !== 'completo');
  if (pendientes.length === 0) {
    Swal.fire('Proceso innecesario', 'Todos los documentos ya están completados.', 'info');
    return;
  }

  // CONTADORES DETALLADOS
  let stats = {
    total: pendientes.length,
    paramsExitos: 0,
    paramsFallidos: 0,
    ocrExitos: 0,
    ocrFallidos: 0
  };

  Swal.fire({
    title: 'Análisis Inteligente',
    html: `
      <div class="mt-3">
        <p>Procesando: <b id="current-index">1</b> de ${pendientes.length}</p>
        <div class="progress mb-2" style="height: 20px;">
          <div id="progress-bar" class="progress-bar progress-bar-striped progress-bar-animated bg-warning" style="width: 0%"></div>
        </div>
        <div id="file-name" class="small text-muted">Iniciando...</div>
      </div>
    `,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });

  for (let i = 0; i < pendientes.length; i++) {
    const doc = pendientes[i];
    
    // Actualizar UI
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) progressBar.style.width = ((i + 1) / pendientes.length * 100) + '%';
    document.getElementById('current-index')!.textContent = (i + 1).toString();
    document.getElementById('file-name')!.textContent = doc.nombre_archivo;

    try {
      const payload = { 
        id_documento: doc.id_documento, 
        idSerie: idSerie,
        id_empresa: this.id_empresa,
        usuario_id: this.usuario_id 
      };

      const resp: any = await this.seccionesService.indexacionOCRIA(payload).toPromise();

      // Lógica de conteo basada en la respuesta del backend
      // Si el backend devuelve un array de documentos, tomamos el primero (ya que procesas de a uno)
      const resultado = resp.documentos[0]; 

      if (resultado.params_success) stats.paramsExitos++; else stats.paramsFallidos++;
      if (resultado.ocr_success) stats.ocrExitos++; else stats.ocrFallidos++;

    } catch (err) {
      stats.paramsFallidos++;
      stats.ocrFallidos++;
    }
  }

  // 4. MENSAJE FINAL DETALLADO
  Swal.fire({
    icon: stats.paramsExitos > 0 || stats.ocrExitos > 0 ? 'success' : 'error',
    title: 'Análisis Finalizado',
    html: `
      <div class="text-start border-top pt-3">
        <p class="mb-1"><b>Resultados de Indexación:</b></p>
        <div class="d-flex justify-content-between mb-2">
          <span>✅ Parámetros detectados:</span> <b>${stats.paramsExitos}</b>
        </div>
        <div class="d-flex justify-content-between mb-2">
          <span>❌ Parámetros fallidos:</span> <b>${stats.paramsFallidos}</b>
        </div>
        <hr>
        <p class="mb-1"><b>Resultados de Texto (OCR):</b></p>
        <div class="d-flex justify-content-between mb-2">
          <span>✅ Texto completo extraído:</span> <b>${stats.ocrExitos}</b>
        </div>
        <div class="d-flex justify-content-between mb-2">
          <span>❌ OCR fallidos/vacíos:</span> <b>${stats.ocrFallidos}</b>
        </div>
      </div>
    `,
    confirmButtonColor: '#ffc107',
    confirmButtonText: 'Actualizar Tabla'
  }).then(() => {
    this.listarDocumentosPorSerie();
  });
}




firmarExpediente(doc: any) {
  // Por ahora solo mostramos un alert para probar
  alert(`Firmando el expediente: ${doc.id}`);
  
  // Aquí puedes agregar la lógica real para firmar el expediente
  // Por ejemplo, abrir un modal, enviar datos al servidor, etc.
}






AbrirControlCalidad(id?: any) {
  const modalRef = this.modalService.open(ControlCalidadComponent, {
    size: 'xl',
    centered: true,
    backdrop: 'static'
  });

  // ENVIAR LOS IDS CORRECTAMENTE:
  // Si 'id' viene por parámetro lo usamos, si no, usamos los del componente padre
  modalRef.componentInstance.idSerie = this.idSeriePadre; 
  modalRef.componentInstance.idSubSerie = id ? id : this.idSubSerie;
  modalRef.componentInstance.ID_EMPRESA = this.id_empresa;

  modalRef.result.then((res) => {
    if (res === true) {
      this.listarDocumentosPorSerie();
    }
  }).catch(() => {});
}





listarDatosDocumento(page: number = 1) {
  // Actualizamos la página actual antes de la petición
  this.paginaActual = page;

  let idAEnviar: number | null = null;
  let parametro: string = '';

  if (this.idSubSerie !== null) {
    idAEnviar = this.idSubSerie;
    parametro = 'idSubserie';
  } 
  else if (this.idSerie !== null) {
    idAEnviar = this.idSerie;
    parametro = 'idSerie';
  }

  if (idAEnviar === null) {
    console.error('❌ No se pudo determinar Serie ni SubSerie');
    return;
  }

  // Agregamos 'page' al payload para que Laravel sepa qué página devolver
  const payload = { 
    [parametro]: idAEnviar,
    page: this.paginaActual 
  };

  Swal.fire({
    title: 'Cargando documentos...',
    text: `Obteniendo página ${this.paginaActual}...`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  this.seccionesService.listarDocumentosPorSerie(payload).subscribe({
    next: (resp: any) => {
      console.log('📥 Respuesta recibida:', resp);
      
      // 3. Sincronizamos metadata (Basado en tu captura: total 57, last_page 3)
      this.totalRegistros = resp.total;
      this.ultimaPagina = resp.last_page;
      this.paginaActual = resp.current_page; // Sincronización estricta con el server

      // 4. Mapeo y procesamiento de documentos
      this.documentos = (resp.documentos || []).map((doc: any) => {
        let parametrosLimpios = [];
        let estadoCalculado = 'vacio';

        try {
          if (doc.parametros_indexados_values) {
            // Doble parse por si viene como string escapado
            const firstParse = JSON.parse(doc.parametros_indexados_values);
            parametrosLimpios = typeof firstParse === 'string' ? JSON.parse(firstParse) : firstParse;

            if (Array.isArray(parametrosLimpios) && parametrosLimpios.length > 0) {
              const tieneValoresVacios = parametrosLimpios.some(p => 
                p.valor === null || 
                p.valor === undefined || 
                p.valor.toString().trim() === ""
              );

              estadoCalculado = tieneValoresVacios ? 'incompleto' : 'completo';
            }
          }
        } catch (e) {
          console.error(`Error en doc ID ${doc.id}:`, e);
          estadoCalculado = 'vacio';
        }

        return {
          ...doc,
          estado_indexacion: estadoCalculado
        };
      });

      Swal.close();
    },
    error: (err) => {
      console.error('❌ Error al obtener documentos', err);
      this.documentos = [];
      Swal.fire('Error', 'No se pudieron cargar los documentos', 'error');
    }
  });
}








abrirCargaExcel() {
  const modalRef = this.modalService.open(SubirExcelMasivoComponent, {
    size: 'xl',
    centered: true,
    backdrop: 'static'
  });



  // 👇 AQUÍ ESTÁ LA MAGIA
  modalRef.result.then((res) => {
    if (res === true) {
      this.listarDocumentosPorSerie(); // 🔥 RECARGA LA TABLA
    }
  }).catch(() => {});
}
}
