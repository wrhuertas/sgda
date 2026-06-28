import {
  Component,
  Input,
  EventEmitter,
  Output,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { IndexacionService } from '../service/indexacion.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { concatMap, from } from 'rxjs';
import Swal from 'sweetalert2';
import { createWorker } from 'tesseract.js';
import Tesseract from 'tesseract.js';






import * as pdfjsLib from 'pdfjs-dist';
import { pdfjsWorker } from 'pdfjs-dist/build/pdf.worker.entry';
// Configurar el worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

@Component({
  selector: 'app-create-indexacion',
  templateUrl: './create-indexacion.component.html',
  styleUrls: ['./create-indexacion.component.scss'],
})
export class CreateIndexacionComponent implements AfterViewInit {
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

  imagenesPDF: string[] = []; // las imágenes en base64 que generas del PDF
  selectedArea: { x: number; y: number; width: number; height: number } | null =
    null;
  isDrawing = false;
  selectedPage: number | null = null;
  recorte: string | null = null; // aquí guardamos la imagen recortada
selectedFiles: File[] = [];

    mostrarTextoOCR: boolean = false;
textoOCR: string = '';

  constructor(
    public activeModal: NgbActiveModal,
    private toast: ToastrService,
    private seccionesService: IndexacionService,
    private sanitizer: DomSanitizer
  ) {}

 

  ngOnInit(): void {
    console.log('ID Modulo recibido:', this.idModulo);
    console.log('Nombre del proyecto recibido:', this.nombreProyecto);
    console.log('ID Indexacion recibido:', this.idIndexacion);
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

  nextPage() {
    if (this.pageNum >= this.pageCount) return;
    this.pageNum++;
    this.renderPage(this.pageNum);
  }

  close() {
    this.activeModal.close();
  }

  agregarCampo() {
    this.campos.push({ valor: '' });
  }

  guardar() {
  if (this.campos.length === 0) {
    this.toast.warning('Agrega al menos un campo.');
    return;
  }

  if (this.archivosSeleccionados.length === 0) {
    this.toast.warning('Debes seleccionar al menos un archivo para guardar.');
    return;
  }

  const formData = new FormData();
  formData.append('campos', JSON.stringify(this.campos));

  // ✅ Agregamos idIndexacion si existe
  if (this.idIndexacion) {
    formData.append('idIndexacion', this.idIndexacion.toString());
  }

  // ✅ Agregamos idProyecto
  if (this.idProyecto) {
    formData.append('idProyecto', this.idProyecto.toString());
  }

   // ✅ Agregamos el texto OCR si existe
  if (this.textoOCR && this.textoOCR.trim() !== '') {
    formData.append('textoOCR', this.textoOCR);
  }

  // Usa archivosSeleccionados para enviar archivos reales
  this.archivosSeleccionados.forEach((file) => {
    formData.append('archivos[]', file, file.name);
  });

  this.seccionesService.registrarDocumento(formData).subscribe({
    next: (res) => {
      this.toast.success('Datos guardados correctamente');
      this.activeModal.close(true);
    },
    error: (err) => {
      this.toast.error('Error al guardar los datos');
    },
  });
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

  /*
procesarArchivos() {
  if (!this.idModulo || this.archivosSeleccionados.length === 0) {
    this.toast.warning('Debe seleccionar archivos y tener un módulo válido');
    return;
  }

  this.archivosProcesados = [];
  this.indiceActual = 0;
  this.urlsSanitizadas = [];

  from(this.archivosSeleccionados).pipe(
    concatMap(async (archivo) => {
      Swal.fire({
        title: `Procesando OCR para archivo: ${archivo.name}`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const formData = new FormData();
      formData.append('modulo_id', this.idModulo.toString());
      formData.append('archivos[]', archivo);

      try {
        const resp = await this.seccionesService.subirArchivos(formData).toPromise();

        if (resp.archivos && Array.isArray(resp.archivos)) {
          this.archivosProcesados.push(...resp.archivos);

          // Aquí no sanitizas: asignas directamente las URLs que recibes
          this.urlsSanitizadas = [...this.archivosProcesados];

          // Asignar el primer PDF a la variable que usa ngx-extended-pdf-viewer
          if (this.urlsSanitizadas.length > 0) {
            this.pdfSrc = this.urlsSanitizadas[0];
          }
        }

        Swal.close();
      } catch (error) {
        Swal.close();
        this.toast.error('Error al subir el archivo ' + archivo.name);
        throw error;
      }
    })
  ).subscribe({
    next: () => {},
    error: (err) => console.error('Error en procesamiento:', err),
    complete: () => {
      this.toast.success('Todos los archivos se procesaron correctamente');
      this.indiceActual = 0;
    }
  });
}
*/

  seleccionarInput(i: number) {
    this.inputSeleccionadoIndex = i;
  }

  /*
 addIframeTextSelectionListener() {
  const iframe = this.pdfIframe?.nativeElement;

  if (iframe) {
    iframe.onload = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (!iframeDoc) return;

        iframeDoc.addEventListener('mouseup', (event: MouseEvent) => {
          const selection = iframeDoc.getSelection()?.toString();
          console.log('Texto seleccionado en iframe:', selection);  // <-- Aquí el log

          if (selection && selection.trim() !== '') {
            this.menuX = event.clientX;
            this.menuY = event.clientY;
            this.textoSeleccionado = selection;
            this.showMenu = true;
          } else {
            this.showMenu = false;
          }
        });
      } catch (error) {
        console.warn('No se pudo acceder al contenido del iframe:', error);
      }
    };

    // En caso de que el iframe ya esté cargado antes de asignar onload, ejecuta manualmente
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      const event = new Event('load');
      iframe.dispatchEvent(event);
    }
  } else {
    console.warn('Iframe no encontrado para agregar listener');
  }
}*/

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

    const maxWidth = 800;
    let textoCompleto = '';

    // ✅ PRIMERA PARTE: convertir PDF a imágenes y mostrarlas
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      const viewportOriginal = page.getViewport({ scale: 1 });
      const scale = maxWidth / viewportOriginal.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      const imageData = canvas.toDataURL('image/png');
      this.imagenesPDF.push(imageData);
    }

    // ✅ Mostrar las imágenes renderizadas antes de iniciar el OCR
    setTimeout(() => this.renderizarCanvas(), 0);
    alert(`PDF convertido a ${this.imagenesPDF.length} imagen(es) PNG.`);

    // ✅ SEGUNDA PARTE: hacer OCR sobre cada imagen mostrada
    for (let i = 0; i < this.imagenesPDF.length; i++) {
      const imageData = this.imagenesPDF[i];

      const resultado = await Tesseract.recognize(imageData, 'spa', {
        logger: info => console.log(`OCR página ${i + 1}:`, info)
      });

      console.log(`Texto OCR página ${i + 1}:`, resultado.data.text);
      textoCompleto += `\n--- Página ${i + 1} ---\n${resultado.data.text}`;
    }

    this.textoOCR = textoCompleto;
    console.log('🧾 Texto completo OCR:', textoCompleto);
    alert('OCR completado. Revisa la consola o el texto debajo.');
  };

  fileReader.readAsArrayBuffer(this.archivoSeleccionadoTemp);
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









///////////////////////////////////////////////////////////subir varios pdfs ////////////////////////////////////



// Convierte base64 a Blob
// Función para convertir base64 a Blob
base64ToBlob(base64: string, type: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
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
          const pdfsSeparados = await this.seccionesService.separarPDF(archivo.nombre).toPromise() || [];

          // 🔹 Subir cada PDF separado
          for (const pdf of pdfsSeparados) {
            const blob = this.base64ToBlob(pdf.file, 'application/pdf');
            const form = new FormData();
            form.append('id_proyecto', this.idProyecto);
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







onMultipleFilesSelected(event: Event): void {
  const input = event.target as HTMLInputElement;

  if (input.files && input.files.length > 0) {
    this.archivosSeleccionados = Array.from(input.files); // Guarda en un array
    console.log('Archivos seleccionados:', this.archivosSeleccionados);
  }
}



// Llamas a esto cuando ya tengas el texto OCR procesado
  mostrarOCR() {
    this.mostrarTextoOCR = true;
  }


}
