import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup } from '@angular/forms';
import { IndexacionSerieService } from '../../indexacion-serie/service/indexacion-serie.service';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { createWorker } from 'tesseract.js';

@Component({
  selector: 'app-indexar-documento',
  templateUrl: './indexar-documento.component.html',
  styleUrls: ['./indexar-documento.component.scss']
})
export class IndexarDocumentoComponent implements OnInit {
  // En la parte superior de tu clase
@ViewChild('imageRef') imageRef!: ElementRef<HTMLImageElement>;
@ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;
  [x: string]: any;
  @Input() idDocumento!: number;
  @Input() idEmpresa!: number;
  @Input() idSerieSubserie!: number;
  @Input() camposExtraTitulos: string[] = []; // opcional
  @Input() rutaDocumento!: string;
   // public urlSegura!: SafeResourceUrl;
  

  form!: FormGroup;
  loading = false;


  recorteActivo = false;
zoomActivo = false;
zoomLevel = 1;
campos: any[] = [];
imagenRecortada: string | null = null;
recorte: string | null = null;

imagenesPDF: string[] = []; // inicialización vacía

// Variable para rastrear el campo activo
campoActivo: string | null = null;


  paginaActual: number = 0;
  totalPaginas: number = 0;
  paginaMostrada: string | null = null; // La imagen base64 que se ve actualmente

  // Página capturada por cada campo cuando el usuario ingresa valor (0-based)
  paginasPorCampo: number[] = [];




  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private indexacionService: IndexacionSerieService,
    
  ) {}

 ngOnInit(): void {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
     if (user && user.id_empresa != null) {
    this.id_empresa = user.id_empresa;
    console.log('ID Empresa del usuario logeado:', this.id_empresa);
  } else {
    console.error('No se pudo obtener el id_empresa del usuario.');
  }

   // ID del usuario (si existe)
   this.usuario_id = user.id ?? null; 
   console.log('Usuario logeado:', this.usuario_id);
    console.log('📥 ID Documento recibido:', this.idDocumento);
    console.log('📥 ID Serie/Subserie recibido:', this.idSerieSubserie); // ¡AQUÍ ESTÁ!
    console.log('📥 ID Empresa recibido:', this.ID_EMPRESA);
    console.log('📥 ID Empresa recibido:', this.id_empresa);


  // Los valores ya indexados se cargan recién cuando existen los campos y el
  // formulario (lo hace obtenerCamposDelDocumento), si no no habría dónde
  // ponerlos y se perderían.
  this.obtenerCamposDelDocumento();
  this.enviarAlServicio();
}

  // Auditoría simple (INDEXACION)
  private _auditStart: Date | null = new Date();

  ngOnDestroy(): void {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const id_usuario = user?.id ? Number(user.id) : null;
      if (this._auditStart && id_usuario && this.idDocumento) {
        const fin = new Date();
        const segundos = Math.max(0, Math.floor((fin.getTime() - this._auditStart.getTime()) / 1000));
        this.indexacionService.registrarAuditoriaDocumental({
          id_documento: this.idDocumento,
          id_usuario,
          accion: 'INDEXACION',
          fecha_inicio: this._auditStart.toISOString(),
          fecha_fin: fin.toISOString(),
          segundos_trabajados: segundos
        }).subscribe({ next: () => {}, error: () => {} });
      }
    } catch {}
  }


obtenerCamposDelDocumento() {
  if (!this.idDocumento) {
    console.error('❌ No existe idDocumento');
    return;
  }

  this.loading = true;

  this.indexacionService.getCamposByDocumento(this.idDocumento)
    .subscribe({
      next: (resp: any) => {
        console.log('✅ RESPUESTA:', resp);

        // LIMPIAR
        this.camposExtraTitulos = [];

        // ✅ CASO 1: viene texto  '["RUC"]'
        if (typeof resp.data === 'string') {
          try {
            this.camposExtraTitulos = JSON.parse(resp.data);
          } catch (e) {
            console.error('❌ Error parseando:', e);
          }
        }

        // ✅ CASO 2: ya viene como array
        if (Array.isArray(resp.data)) {
          this.camposExtraTitulos = resp.data;
        }

        console.log('✅ CAMPOS LISTOS:', this.camposExtraTitulos);

        // CREAR FORMULARIO DINÁMICO
        const group: any = {};

        this.camposExtraTitulos.forEach((campo, i) => {
          group[`campo_${i}`] = [''];
        });

        this.form = this.fb.group(group);

        // Inicializar páginas por campo con 0
        this.paginasPorCampo = new Array(this.camposExtraTitulos.length).fill(0);

        this.loading = false;

        // Con el formulario ya armado se traen los valores guardados antes
        this.datosDocumento();
      },

      error: (err) => {
        console.error('❌ Error campos:', err);
        this.loading = false;
      }
    });
}





imagenesPdf: string[] = []; // Array para almacenar todas las páginas en base64

enviarAlServicio() {
  if (!this.id_empresa) {
    alert('No se pudo obtener el ID de la empresa.');
    return;
  }

  // Abrimos el Swal de carga inicial
  Swal.fire({
    title: 'Cargando documento...',
    text: 'Obteniendo información y vista previa',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  // Solo necesitamos llamar a cargarPagina(0)
  // Esta función ahora se encargará de setear la imagen Y la info del documento
  this.cargarPagina(0);
}

cargarPagina(index: number) {
  this.paginaMostrada = '';
  const payload = {
    idDocumento: this.idDocumento,
    idEmpresa: this.id_empresa,
    idSerieSubserie: this.idSerieSubserie || null,
    page: index // Ahora TS ya no marcará error aquí
  };

  this.indexacionService.obtenerDocumentoUrl(payload).subscribe({
    next: (resp: any) => {
      if (resp.success && resp.data) {
        // 1. Imagen y Paginación
        this.paginaMostrada = resp.data.imagen;
        this.totalPaginas = resp.data.total_paginas;
        this.paginaActual = resp.data.pagina_actual;
        // Auditoría deshabilitada

        // 2. Preservar Información del Documento
        // Mantenemos los datos para los campos de la izquierda (RUC, Beneficiario, etc.)
        if (resp.data.documento) {
          this.documentoSeleccionado = resp.data.documento;
          // Si usas variables directas para los inputs:
          this.nombre_archivo = resp.data.nombre;
          this.tipo_archivo = resp.data.tipo;
        }

        Swal.close();
      }
    },
    error: (err) => {
      console.error('Error en carga por demanda:', err);
      Swal.close();
      Swal.fire('Error', 'No se pudo cargar la página solicitada', 'error');
    }
  });
}





siguientePagina() {
  if (this.paginaActual < this.totalPaginas - 1) {
    Swal.fire({ title: 'Cargando página...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.cargarPagina(this.paginaActual + 1);
  }
}

paginaAnterior() {
  if (this.paginaActual > 0) {
    Swal.fire({ title: 'Cargando página...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.cargarPagina(this.paginaActual - 1);
  }
}


activarZoom() {
  this.zoomActivo = !this.zoomActivo;
  if (this.zoomActivo) this.recorteActivo = false;
}

zoomIn() {
  this.zoomLevel += 0.1;
  // Auditoría deshabilitada
}

zoomOut() {
  if (this.zoomLevel > 0.2) {
    this.zoomLevel -= 0.1;
  }
  // Auditoría deshabilitada
}








activarRecorte() {
  this.recorteActivo = !this.recorteActivo;

  const canvases = document.querySelectorAll('canvas');

  if (this.recorteActivo) {
    this.zoomActivo = false;
    canvases.forEach(canvas => {
      (canvas as HTMLCanvasElement).style.cursor = 'crosshair';
    });
  } else {
    canvases.forEach(canvas => {
      (canvas as HTMLCanvasElement).style.cursor = 'grab';
    });
  }
}






ajustarCanvas(img: HTMLImageElement, canvas: HTMLCanvasElement) {
  // Solo igualamos el tamaño visual para que las coordenadas coincidan
  canvas.width = img.clientWidth;
  canvas.height = img.clientHeight;

  const ctx = canvas.getContext('2d')!;
  // Limpiamos todo para que sea 100% transparente
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Borra el "temp.onload" y el "drawImage" de aquí, no son necesarios 
  // porque la imagen ya se ve por detrás gracias al HTML.
}




onMouseDown(event: MouseEvent, pageIndex: number) {
  if (!this.recorteActivo) return;

  this.isDrawing = true;
  this.startX = event.offsetX;
  this.startY = event.offsetY;
  this.selectedPage = pageIndex;
  this.recorte = null;

  const canvas = event.target as HTMLCanvasElement;
  canvas.style.cursor = 'crosshair';
}

onMouseMove(event: MouseEvent, pageIndex: number) {
  if (!this.isDrawing || !this.recorteActivo) return;

  // Accedemos al canvas directamente desde el evento para evitar el error de "undefined"
  const canvas = event.target as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const currentX = event.offsetX;
  const currentY = event.offsetY;

  const width = currentX - this.startX;
  const height = currentY - this.startY;

  // 1. Limpiar el canvas transparente
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Dibujar el cuadro rojo
  ctx.beginPath();
  ctx.setLineDash([6]);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(this.startX, this.startY, width, height);
}

onMouseUp(event: MouseEvent, pageIndex: number) {
  if (!this.isDrawing) return;
  this.isDrawing = false;

  const canvas = event.target as HTMLCanvasElement;
  const imgElement = this.imageRef.nativeElement;

  const endX = event.offsetX;
  const endY = event.offsetY;
  
  // 1. Calcular la escala real (Proporción entre el archivo y lo que ves)
  const escalaX = imgElement.naturalWidth / imgElement.clientWidth;
  const escalaY = imgElement.naturalHeight / imgElement.clientHeight;

  // 2. Coordenadas de la selección en pantalla
  const sx = Math.min(this.startX, endX);
  const sy = Math.min(this.startY, endY);
  const sw = Math.abs(endX - this.startX);
  const sh = Math.abs(endY - this.startY);

  if (sw < 2 || sh < 2) return;

  // 3. Crear el canvas del recorte con el tamaño REAL de los píxeles
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sw * escalaX;
  tempCanvas.height = sh * escalaY;
  const tempCtx = tempCanvas.getContext('2d')!;

  // 4. Recortar usando las escalas para que coincida con "Totales:"
  tempCtx.drawImage(
    imgElement, 
    sx * escalaX, sy * escalaY, sw * escalaX, sh * escalaY, // Área real en el archivo
    0, 0, tempCanvas.width, tempCanvas.height             // Destino en la miniatura
  );

  this.recorte = tempCanvas.toDataURL('image/png');
  
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  this.hacerOCDelRecorte();
  // Marcar limpieza en esta página
  // Auditoría deshabilitada
}


// Función para capturar cuál input seleccionó el usuario
setCampoActivo(nombreCampo: string) {
  this.campoActivo = nombreCampo;
}


async hacerOCDelRecorte() {
  if (!this.recorte) return;

  // El OCR tarda unos segundos y no se ve nada mientras corre, así que se
  // avisa y se bloquea la pantalla hasta que termine
  Swal.fire({
    title: 'Procesando OCR',
    text: 'Leyendo el texto seleccionado...',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => { Swal.showLoading(); }
  });

  let textoLimpio = '';

  try {
    const worker = createWorker({ logger: (m) => console.log(m) });
    await worker.load();
    await worker.loadLanguage('spa');
    await worker.initialize('spa');

    // OCR directo sobre la imagen base64
    const { data: { text } } = await worker.recognize(this.recorte);

    await worker.terminate();

    textoLimpio = text.trim();
  } catch (e) {
    console.error('❌ Error en el OCR:', e);
    await Swal.fire('Error', 'No se pudo leer el texto seleccionado', 'error');
    return;
  }

  if (!textoLimpio) {
    await Swal.fire('Sin texto', 'No se detectó texto en el recorte', 'info');
    return;
  }

  // Colocar el texto en el primer campo vacío
  let controlEncontrado = null;
  let nombreCampo = '';
  for (let i = 0; i < this.camposExtraTitulos.length; i++) {
    const nombre = 'campo_' + i;
    const control = this.form.get(nombre);
    if (control && (!control.value || control.value.trim() === '')) {
      controlEncontrado = control;
      nombreCampo = this.camposExtraTitulos[i];
      break;
    }
  }

  if (controlEncontrado) {
    controlEncontrado.setValue(textoLimpio);
    await Swal.fire({
      icon: 'success',
      title: 'OCR colocado',
      text: `El texto fue colocado en: ${nombreCampo}`
    });
  } else {
    await Swal.fire({
      icon: 'info',
      title: 'Todos los campos están llenos',
      text: 'No hay ningún campo vacío disponible'
    });
  }
}



guardar() {
  if (this.form.invalid) {
    Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'warning');
    return;
  }

  // La serie no siempre llega desde la pantalla que abre el modal, así que se
  // toma la del propio documento. Sin esto el guardado se cortaba en silencio.
  const idSerie = this.idSerieSubserie ?? this.documentoSeleccionado?.id_serie_subserie ?? null;

  if (!idSerie) {
    Swal.fire('Error', 'No se pudo identificar la serie del documento', 'error');
    return;
  }

  if (!this.idDocumento || !this.id_empresa) {
    Swal.fire('Error', 'Faltan datos del documento para poder guardar', 'error');
    return;
  }

  const datosFormulario = this.form.value; // { campo_0: '1220643442', campo_1: '123456', campo_2: '02/08/2025' }

  // Construimos el array de campos con nombres reales de la serie
  // Agregamos 'tipo' (por ahora fijo 'si' para entradas manuales)
  const camposIndexados = this.camposExtraTitulos.map((nombreCampo, i) => {
    const valor = (datosFormulario[`campo_${i}`] || '').toString().trim();
    return {
      nombre: nombreCampo,
      valor: valor !== '' ? valor : null,
      // Si el valor está vacío => 'no', si tiene contenido => 'si'
      tipo: valor !== '' ? 'si' : 'no',
      // Nueva propiedad: página (enviamos 1-based al backend)
      pagina: Number.isInteger(this.paginasPorCampo[i]) ? (this.paginasPorCampo[i] + 1) : 1
    };
  });

  // Creamos FormData para enviar al backend
  const payload = new FormData();
  payload.append('id_documento', this.idDocumento.toString());
  payload.append('id_serie', idSerie.toString());
  payload.append('id_empresa', this.id_empresa.toString());
  payload.append('campos', JSON.stringify(camposIndexados));

  // Usuario logeado (necesario para la auditoría de la indexación)
  if (this.usuario_id) { payload.append('usuario_id', this.usuario_id.toString()); }

  console.log('Payload a enviar:', camposIndexados);

  this.loading = true;
  this.indexacionService.guardarIndexacion(payload).subscribe({
    next: (res: any) => {
      this.loading = false;
      Swal.fire('Éxito', 'Documento indexado correctamente', 'success');
      this.activeModal.close(true); // cerrar modal
    },
    error: (err: any) => {
      this.loading = false;
      Swal.fire('Error', 'No se pudo guardar el documento', 'error');
      console.error(err);
    }
  });
}



datosDocumento() {
  if (!this.idDocumento) return;

  // Sin formulario no hay dónde escribir los valores
  if (!this.form) {
    console.warn('⚠️ Todavía no está armado el formulario, no se cargan los valores');
    return;
  }

  this.indexacionService.getDocumentoById(this.idDocumento).subscribe({
    next: (resp: any) => {
      console.log('✅ RESPUESTA BD:', resp);
      if (!resp.status || !resp.data) return;

      const documento = resp.data;
      this.doc = {
        id: documento.id_documento,
        nombre: documento.nombre_archivo,
        ruta: documento.ruta_archivo
      };

      // Si la pantalla que abrió el modal no mandó la serie, se usa la del
      // documento, que es la que vale de todas formas
      if (!this.idSerieSubserie && documento.id_serie_subserie) {
        this.idSerieSubserie = documento.id_serie_subserie;
      }

      if (!documento.parametros_indexados_values) return;

      // El campo puede llegar como arreglo o como texto JSON, y a veces
      // codificado más de una vez, así que se desarma hasta dar con la lista
      let valoresIndexados: any = documento.parametros_indexados_values;

      for (let i = 0; i < 3 && typeof valoresIndexados === 'string'; i++) {
        try {
          valoresIndexados = JSON.parse(valoresIndexados);
        } catch (e) {
          console.error('❌ Error parseando JSON string:', e);
          return;
        }
      }

      if (!Array.isArray(valoresIndexados)) {
        console.warn('⚠️ Los parámetros guardados no son una lista:', valoresIndexados);
        return;
      }

      console.log('📊 Valores a procesar:', valoresIndexados);

      // ✅ Llenado del formulario
      valoresIndexados.forEach((item: any) => {
        if (!item || !item.nombre) { return; }

        const index = this.camposExtraTitulos.findIndex(
          campo => campo.trim().toUpperCase() === String(item.nombre).trim().toUpperCase()
        );

        if (index !== -1) {
          const controlName = 'campo_' + index;
          const control = this.form.get(controlName);
          
          if (control) {
            console.log(`✍️ Seteando ${controlName}:`, item.valor);
            control.setValue(item.valor);
          }
        } else {
          console.warn(`⚠️ No se encontró coincidencia para el título: "${item.nombre}"`);
        }
      });

      // Forzar validación visual
      this.form.markAsPristine();
      this.form.updateValueAndValidity();
    },
    error: (err) => console.error('❌ Error al obtener documento:', err)
  });
}






firmaX: number = 50;
firmaY: number = 200;
firmaWidth: number = 200;
firmaHeight: number = 100;

// Variables para arrastrar
dragging: boolean = false;
dragOffsetX: number = 0;
dragOffsetY: number = 0;

// Activar firma
activarFirma() {
  this.firmaActiva = true;
  console.log('Modo firma activado');
}

// 1. INICIA ARRASTRE
startDrag(event: MouseEvent) {
  event.preventDefault();
  this.dragging = true;

  const visor = document.querySelector('.img-fluid') as HTMLElement;
  if (visor) {
    const rect = visor.getBoundingClientRect();
    
    // Calculamos el clic relativo a la esquina de la IMAGEN, no de la pantalla
    const clickXRelativoAImagen = event.clientX - rect.left;
    const clickYRelativoAImagen = event.clientY - rect.top;

    // El offset es la distancia entre el clic y donde ya estaba el cuadro verde
    this.dragOffsetX = clickXRelativoAImagen - this.firmaX;
    this.dragOffsetY = clickYRelativoAImagen - this.firmaY;
  }


  window.addEventListener('mousemove', this.onDrag);
  window.addEventListener('mouseup', this.stopDrag);
}

// 2. MOVIMIENTO (onDrag)
onDrag = (event: MouseEvent) => {
  if (!this.dragging) return;

  const visor = document.querySelector('.img-fluid') as HTMLElement;
  if (visor) {
    const rect = visor.getBoundingClientRect();

    // Posición actual del mouse relativa a la imagen
    let mouseXRelativo = event.clientX - rect.left;
    let mouseYRelativo = event.clientY - rect.top;

    // Nueva posición restando el offset inicial
    let newX = mouseXRelativo - this.dragOffsetX;
    let newY = mouseYRelativo - this.dragOffsetY;

    // LÍMITES: Para que no se salga de la factura (Esto permite moverlo por toda la hoja)
    this.firmaX = Math.max(0, Math.min(newX, rect.width - this.firmaWidth));
    this.firmaY = Math.max(0, Math.min(newY, rect.height - this.firmaHeight));
  }
}

// Termina arrastre
stopDrag = (event: MouseEvent) => {
  this.dragging = false;
  window.removeEventListener('mousemove', this.onDrag);
  window.removeEventListener('mouseup', this.stopDrag);
}

// Capturar página actual cuando el usuario escribe en el campo i (fuera de otros métodos)
onCampoInput(i: number) {
  const control = this.form.get(`campo_${i}`);
  if (!control) return;
  const val = (control.value ?? '').toString().trim();
  if (val !== '') {
    // Guardar la página actual (0-based) en el índice correspondiente
    this.paginasPorCampo[i] = this.paginaActual;
  }
}

// Firmar documento (ejemplo)
firmarDocumento() {
  console.log('🖊 Click en firmar');

  const imgElement = document.querySelector('.img-fluid') as HTMLElement;

  if (!this.doc || !imgElement) {
    Swal.fire('Error', 'No se pudo cargar el visor del documento', 'error');
    return;
  }

  if (!this.usuario_id) {
    Swal.fire('Sesión caducada', 'Debe iniciar sesión nuevamente', 'warning');
    return;
  }

  // Mostramos un loader para dar feedback al usuario
  Swal.fire({
    title: 'Firmando documento...',
    text: 'Por favor, espere un momento',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  const formData = new FormData();
  formData.append('idDoc', this.doc.id.toString());
  formData.append('nombreDoc', this.doc.nombre);
  formData.append('rutaDoc', this.doc.ruta);
  formData.append('usuario_id', this.usuario_id.toString());
  formData.append('id_empresa', this.id_empresa.toString());
  formData.append('pagina_a_firmar', (this.paginaActual + 1).toString());
  formData.append('x', this.firmaX.toString());
  formData.append('y', this.firmaY.toString());
  formData.append('width', this.firmaWidth.toString());
  formData.append('height', this.firmaHeight.toString());
  formData.append('ancho_visor', imgElement.offsetWidth.toString());
  formData.append('alto_visor', imgElement.offsetHeight.toString());

  if (this.firmaBase64) {
    const blob = this.base64ToBlob(this.firmaBase64, 'image/png');
    formData.append('firma', blob, 'firma.png');
  }

  this.indexacionService.firmarDocumento(formData).subscribe({
    next: (res: any) => {
      Swal.close();
      Swal.fire('¡Firmado!', 'El documento se ha firmado con éxito.', 'success');
      console.log('✅ Éxito:', res);
      if (this.IndexacionC) {
        this.IndexacionC.emit(); 
      }
      this.activeModal.close(true); // cerrar modal
    },
    error: (err: any) => {
      Swal.close(); // Cerramos el loader
      console.error('❌ Error capturado:', err);

      // Extraemos el mensaje enviado desde Laravel (el mensaje de "No tiene firma")
      const mensajeError = err.error?.message || 'Error al procesar la firma electrónica';

      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: mensajeError,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Entendido'
      });
    }
  });
}




// Función para convertir base64 a Blob
private base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}






  cancelar() {
    this.activeModal.dismiss();
  }
}
