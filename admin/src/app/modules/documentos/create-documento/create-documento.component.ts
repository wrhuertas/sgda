import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DocumentosService } from '../service/docuemntos.service';

@Component({
  selector: 'app-create-documento',
  templateUrl: './create-documento.component.html',
  styleUrls: ['./create-documento.component.scss']
})
export class CreateDocumentoComponent implements OnInit, AfterViewInit {

  @Input() docData: any;               // Datos del documento recibido
  imagenesPDF: string[] = [];          // Array de imágenes (una por página)

  // Control de recorte y zoom
  recorteActivo = false;
  zoomActivo = false;
  maxWidth = 600;
  maxHeight = 800;

  // Variables de selección
  seleccionActiva = false;
  seleccionX = 0;
  seleccionY = 0;
  seleccionWidth = 0;
  seleccionHeight = 0;
  private startX = 0;
  private startY = 0;
  private isMouseDown = false;

// Selección azul (recorte/edición)

paginaSeleccionada: number = -1;

// Selección verde (firma)
firmaActiva = false;
firmaX = 0;
firmaY = 0;
firmaWidth = 150;
firmaHeight = 50;
paginaFirma: number = -1;

// Configuración PDF

pdfFile: any;
pdfRuta: string = ''; 

loggedUser: any = {};

  @ViewChild('imagenCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private currentImage!: HTMLImageElement;

  constructor(
    public activeModal: NgbActiveModal,
    private documentosService: DocumentosService
  ) { }

  ngOnInit(): void {
    this.loggedUser = JSON.parse(localStorage.getItem('user') || '{}'); // <- asignación correcta
  console.log('Usuario logueado para documento:', this.loggedUser);
    console.log('Datos recibidos en modal PDF:', this.docData);
     if (this.docData && this.docData.archivo_url) {
    this.pdfRuta = this.docData.archivo_url;
    console.log('Ruta PDF guardada:', this.pdfRuta);
  } else {
    console.warn('⚠️ No se recibió archivo_url en los datos del modal.');
  }
    this.enviarAlBackend();
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      this.ctx = canvas.getContext('2d')!;
    }
  }

  enviarAlBackend() {
    if (!this.docData?.archivo_url) return;

    this.documentosService.enviarPDF({ archivo_url: this.docData.archivo_url })
      .subscribe({
        next: (res: any) => {
          console.log('PDF procesado correctamente:', res);
          if (res.imagenes && res.imagenes.length) {
            this.imagenesPDF = res.imagenes.map((img: string) => `data:image/png;base64,${img}`);
            this.cargarImagen(this.imagenesPDF[0]); // Solo primera página por ahora
          }
        },
        error: (err) => {
          console.error('Error enviando PDF:', err);
          alert('Ocurrió un error al procesar el PDF.');
        }
      });
  }

  cargarImagen(imgSrc: string) {
    const canvas = this.canvasRef.nativeElement;
    this.currentImage = new Image();
    this.currentImage.src = imgSrc;
    this.currentImage.onload = () => {
      canvas.width = this.currentImage.width;
      canvas.height = this.currentImage.height;
      this.ctx.drawImage(this.currentImage, 0, 0);
    };
  }

  cerrarModal() {
    this.activeModal.dismiss();
  }

  // Botones (sin funcionalidad real)
  zoom() { console.log('Zoom presionado'); }
// Método para "limpiar" la zona seleccionada (relleno blanco)
limpiar() {
  if (!this.seleccionActiva || this.seleccionWidth === 0 || this.seleccionHeight === 0) return;

  // Tomamos la primera imagen (puedes adaptarlo para cada página)
  const imgElement = new Image();
  imgElement.src = this.imagenesPDF[0];
  imgElement.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = imgElement.width;
    canvas.height = imgElement.height;
    const ctx = canvas.getContext('2d')!;

    // Dibujar la imagen original
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    // Calcular escala entre la imagen visible y la real
    const scaleX = imgElement.width / this.maxWidth;
    const scaleY = imgElement.height / this.maxHeight;

    // Rellenar la selección con blanco
    ctx.fillStyle = 'white';
    ctx.fillRect(
      this.seleccionX * scaleX,
      this.seleccionY * scaleY,
      this.seleccionWidth * scaleX,
      this.seleccionHeight * scaleY
    );

    // Actualizar la imagen mostrada con la nueva versión
    this.imagenesPDF[0] = canvas.toDataURL('image/png');

    // Limpiar la selección
    this.seleccionActiva = false;
    this.seleccionWidth = 0;
    this.seleccionHeight = 0;
  };
}



  recortar() { console.log('Recortar presionado'); }
  girar() { console.log('Girar presionado'); }
  firmar() { console.log('Firmar presionado'); }

  // Selección sobre canvas
// Selección sobre cualquier contenedor
startSelection(event: MouseEvent, contenedor: HTMLElement) {
  event.preventDefault();
  event.stopPropagation();
  this.isMouseDown = true;
  this.seleccionActiva = true;

  const rect = contenedor.getBoundingClientRect();
  this.startX = event.clientX - rect.left;
  this.startY = event.clientY - rect.top;

  this.seleccionX = this.startX;
  this.seleccionY = this.startY;
  this.seleccionWidth = 0;
  this.seleccionHeight = 0;
}

moveSelection(event: MouseEvent, contenedor: HTMLElement) {
  if (!this.isMouseDown) return;

  const rect = contenedor.getBoundingClientRect();
  let offsetX = event.clientX - rect.left;
  let offsetY = event.clientY - rect.top;

  this.seleccionWidth = offsetX - this.startX;
  this.seleccionHeight = offsetY - this.startY;

  if (this.seleccionWidth < 0) {
    this.seleccionX = this.startX + this.seleccionWidth;
    this.seleccionWidth = Math.abs(this.seleccionWidth);
  } else {
    this.seleccionX = this.startX;
  }

  if (this.seleccionHeight < 0) {
    this.seleccionY = this.startY + this.seleccionHeight;
    this.seleccionHeight = Math.abs(this.seleccionHeight);
  } else {
    this.seleccionY = this.startY;
  }
}

endSelection(event?: MouseEvent) {
  if (!this.isMouseDown) return;
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  this.isMouseDown = false;
  console.log('Selección finalizada:', {
    x: this.seleccionX,
    y: this.seleccionY,
    width: this.seleccionWidth,
    height: this.seleccionHeight
  });
}




// ===== Firma =====
// Selección azul (recorte/edición)



// ==================== FIRMA ====================
activarFirma() {
  alert('Haga clic en el documento donde desea colocar la firma');
  this.firmaActiva = true;
}

colocarFirma(event: MouseEvent, pagina: number) {
  if (!this.firmaActiva) return;

  const rect = (event.target as HTMLElement).getBoundingClientRect();
  this.firmaX = event.clientX - rect.left;
  this.firmaY = event.clientY - rect.top;
  this.paginaFirma = pagina;

  if (confirm('¿Desea colocar la firma aquí?')) {
    this.firmaActiva = false;
    this.enviarFirmaAlBackend();
  }
}

enviarFirmaAlBackend() {
  if (!this.pdfRuta) {
    alert('No hay PDF cargado para firmar.');
    return;
  }

  const data = {
    pagina: this.paginaFirma,
    x: this.firmaX,
    y: this.firmaY,
    width: this.firmaWidth,
    height: this.firmaHeight,
    pdfOriginal: this.pdfRuta,
    empresaId: this.loggedUser.id_empresa // ✅ ahora sí se envía
  };

  console.log('📤 Enviando datos de firma al servicio:', data);

  this.documentosService.firmarPDF(data).subscribe({
    next: (response: any) => {
      console.log('✅ Respuesta del backend:', response);
      alert('Documento firmado con éxito.');
    },
    error: (err) => {
      console.error('❌ Error al firmar el documento:', err);
      alert('Hubo un error al firmar el documento.');
    }
  });
}







}
