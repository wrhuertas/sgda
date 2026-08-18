import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-visor-pdf',
  templateUrl: './visor-pdf.component.html',
  styleUrls: ['./visor-pdf.component.scss']
})
export class VisorPdfComponent implements OnInit {
  @Input() urlPdf!: string;
  @Input() nombreArchivo!: string;

  // Fallback para mostrar PDF en un iframe cuando pdf.js no puede cargar (CORS, rangos)
  useIframe: boolean = false;
  sanitizedUrl: SafeResourceUrl | null = null;

  // Estado del visor
  paginaActual = 1;
  totalPaginas = 0;
  jumpPage: number | null = null;
  pdfDocument: any = null;

  // Zoom del visor
  zoomScale = 1;
  private readonly zoomStep = 0.2;
  private readonly minZoom = 0.5;
  private readonly maxZoom = 3;

  // Canvas para renderizar
  canvasData: string | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (!this.urlPdf) {
      Swal.fire('Error', 'No se proporcionó URL del PDF', 'error');
      this.activeModal.dismiss();
      return;
    }

    this.cargarPDF();
  }

  // Cargar PDF usando PDF.js
  async cargarPDF() {
    try {
      // Cargar PDF.js dinámicamente
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      // Cargar el PDF desde la URL.
      // Usamos el objeto de configuración para poder añadir opciones y evitar problemas con CORS
      const loadingTask = pdfjsLib.getDocument({ url: this.urlPdf, withCredentials: false });
      const pdf = await loadingTask.promise;
      this.pdfDocument = pdf;
      this.totalPaginas = pdf.numPages;
      
      // Cargar primera página
      await this.renderizarPagina(this.paginaActual);
    } catch (error: any) {
      console.error('Error al cargar PDF (pdf.js):', error);

      // Primero intentamos el fallback en iframe. Si funciona, no mostramos un error al usuario.
      try {
        this.useIframe = true;
        this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.urlPdf);
        this.canvasData = null; // ocultar canvas
        console.info('Fallback a iframe activado para mostrar el PDF');
        return;
      } catch (e) {
        console.error('No se pudo usar iframe como fallback:', e);
        // Si tampoco podemos usar iframe, mostramos el error al usuario y como último recurso abrimos en nueva pestaña
        Swal.fire('Error', 'No se pudo cargar el PDF: ' + (error.message || error), 'error');
        try { window.open(this.urlPdf, '_blank'); } catch (e2) { console.error('No se pudo abrir en nueva pestaña:', e2); }
      }
    }
  }

  // Renderizar una página específica
  async renderizarPagina(numeroPagina: number) {
    if (!this.pdfDocument || numeroPagina < 1 || numeroPagina > this.totalPaginas) {
      return;
    }

    try {
      const page = await this.pdfDocument.getPage(numeroPagina);
      const viewport = page.getViewport({ scale: this.zoomScale });

      // Crear canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (!context) {
        Swal.fire('Error', 'No se pudo obtener contexto del canvas', 'error');
        return;
      }

      // Renderizar página
      await page.render({ canvasContext: context, viewport }).promise;

      // Convertir a base64
      this.canvasData = canvas.toDataURL('image/png');
      this.paginaActual = numeroPagina;
    } catch (error: any) {
      console.error('Error al renderizar página:', error);
      Swal.fire('Error', 'No se pudo renderizar la página', 'error');
    }
  }

  // Controles de navegación
  paginaAnterior() {
    if (this.paginaActual > 1) {
      this.renderizarPagina(this.paginaActual - 1);
    }
  }

  siguientePagina() {
    if (this.paginaActual < this.totalPaginas) {
      this.renderizarPagina(this.paginaActual + 1);
    }
  }

  irAPagina() {
    if (this.jumpPage && this.jumpPage >= 1 && this.jumpPage <= this.totalPaginas) {
      this.renderizarPagina(this.jumpPage);
      this.jumpPage = null;
    } else {
      Swal.fire('Advertencia', `Ingrese un número entre 1 y ${this.totalPaginas}`, 'warning');
    }
  }

  // Controles de zoom
  zoomMas() {
    if (this.zoomScale < this.maxZoom) {
      this.zoomScale += this.zoomStep;
      this.renderizarPagina(this.paginaActual);
    }
  }

  zoomMenos() {
    if (this.zoomScale > this.minZoom) {
      this.zoomScale -= this.zoomStep;
      this.renderizarPagina(this.paginaActual);
    }
  }

  resetZoom() {
    this.zoomScale = 1;
    this.renderizarPagina(this.paginaActual);
  }

  // Descargar PDF
  descargarPDF() {
    const link = document.createElement('a');
    link.href = this.urlPdf;
    link.download = this.nombreArchivo || 'documento.pdf';
    link.click();
  }
}
