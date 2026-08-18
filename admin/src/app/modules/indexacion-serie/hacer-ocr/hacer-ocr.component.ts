import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { IndexacionSerieService } from '../service/indexacion-serie.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-hacer-ocr',
  templateUrl: './hacer-ocr.component.html',
  styleUrls: ['./hacer-ocr.component.scss']
})
export class HacerOcrComponent implements OnInit {
  
  @Input() idSerie: any;       // Recibimos el ID de la Serie
  @Input() idSubSerie: any;    // Recibimos el ID de la Subserie (opcional)
  @Input() ID_EMPRESA: any;
  @Input() idNivel: any;
  @Input() rutaCompleta: any;

  documentos: any[] = [];
  filtro: string = '';
  usuario_id: any = null;

  // Paginación
  paginaActual: number = 1;
  totalRegistros: number = 0;
  ultimaPagina: number = 1;

  LIMITE_MB: number = 10240;

  opciones = {
    soloTexto: true,
    soloParametros: false,
    ambos: false
  };

  constructor(
    public activeModal: NgbActiveModal,
    private http: HttpClient,
    private seccionesService: IndexacionSerieService,// Inyectamos tu servicio
  ) {}

  ngOnInit(): void {
    // 1. IMPRIMIMOS LO QUE LLEGA AL COMPONENTE
    console.log('--- DATOS RECIBIDOS AL ABRIR MODAL ---');
    console.log('ID Serie:', this.idSerie);
    console.log('ID SubSerie:', this.idSubSerie);
    console.log('ID Empresa:', this.ID_EMPRESA);

    // Usuario logeado (necesario para la auditoría del OCR)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.usuario_id = user.id ?? null;

    // Al iniciar, cargamos la primera página
    this.cargarDocumentosAlInicio();
  }

  cargarDocumentosAlInicio(page: number = 1) {
  this.paginaActual = page;

  // 1. Identificamos qué serie/subserie listar
  const idAEnviar = this.idSubSerie || this.idSerie;
  const parametro = this.idSubSerie ? 'idSubserie' : 'idSerie';

  // 2. Preparamos el paquete de datos
  const payload: any = { 
    [parametro]: idAEnviar,
    id_empresa: this.ID_EMPRESA,
    page: this.paginaActual
  };

  // Asignamos SOLO el último nivel disponible
  if (this.rutaCompleta?.carpeta?.id) {
    payload.id_carpeta = this.rutaCompleta.carpeta.id;
  } else if (this.rutaCompleta?.caja?.id) {
    payload.id_caja = this.rutaCompleta.caja.id;
  } else if (this.rutaCompleta?.fila?.id) {
    payload.id_fila = this.rutaCompleta.fila.id;
  } else if (this.rutaCompleta?.estanteria?.id) {
    payload.id_estanteria = this.rutaCompleta.estanteria.id;
  } else if (this.rutaCompleta?.sala?.id) {
    payload.id_sala = this.rutaCompleta.sala.id;
  } else if (this.rutaCompleta?.edificio?.id) {
    payload.id_edificio = this.rutaCompleta.edificio.id;
  }

  // 3. LLAMADA AL SERVICIO (El procesamiento de la respuesta está intacto como pediste)
  this.seccionesService.listarDocumentosOCRPorSerie(payload).subscribe({
   next: (resp: any) => {
  // Ahora tomamos los datos de 'resp.data' (por el paginate de Laravel)
  const lista = resp.data || []; 
  
  console.log('Documentos recibidos:', lista);

  this.documentos = lista.map((doc: any) => {
    return {
      ...doc,
      seleccionado: false,
      peso_bytes: Number(doc.tamano_archivo || doc.size || 0),
      ocr_status: (doc.datos_ocr && doc.datos_ocr.toString().trim() !== '') ? 'INDEXADO' : 'NO INDEXADO',
      param_status: (doc.parametros_indexados_values !== null) ? 'INDEXADO' : 'NO INDEXADO'
    };
  });

  // Ajustamos también la paginación a la estructura estándar de Laravel
  this.totalRegistros = resp.total || 0;
  this.ultimaPagina = resp.last_page || 1;
}
  });
}

  // Agrega esta función en tu componente
get documentosFiltrados() {
  if (!this.filtro || this.filtro.trim() === '') {
    return this.documentos; // Si no hay búsqueda, mostramos todos
  }

  const busqueda = this.filtro.toLowerCase().trim();

  return this.documentos.filter(doc => {
    // Buscamos en el nombre o en el código (si existe)
    const nombre = doc.nombre ? doc.nombre.toLowerCase() : '';
    const codigo = doc.codigo_documento ? doc.codigo_documento.toLowerCase() : '';
    
    return nombre.includes(busqueda) || codigo.includes(busqueda);
  });
}

// Calcula el peso total en Megabytes
obtenerPesoTotalSeleccionados(): number {
  const totalBytes = this.documentos
    .filter(d => d.seleccionado)
    .reduce((sum, d) => sum + (d.peso_bytes || 0), 0);
  
  // Convertir bytes a MB (1024 * 1024)
  return totalBytes / (1024 * 1024);
}

// Verifica si excede los 50MB
excedeLimitePeso(): boolean {
  return this.obtenerPesoTotalSeleccionados() > this.LIMITE_MB;
}

// Validar que al menos un proceso esté marcado
hayOpcionSeleccionada(): boolean {
  return this.opciones.soloTexto || this.opciones.soloParametros || this.opciones.ambos;
}


validarSeleccionIndividual(doc: any, event: any) {
  console.log('Peso del archivo detectado:', doc.peso_bytes); // Si sale undefined, el nombre en el map está mal
  const checkbox = event.target as HTMLInputElement;

  // Solo validamos si el usuario está intentando marcar el checkbox
  if (checkbox.checked) {
    // 1. VALIDACIÓN DE PESO (Límite 50 MB)
    // Calculamos cuánto pesaría el total si sumamos este nuevo archivo
    const pesoActualMB = this.obtenerPesoTotalSeleccionados();
    const pesoEsteArchivoMB = (doc.peso_bytes || 0) / (1024 * 1024);
    const pesoProyectado = pesoActualMB + pesoEsteArchivoMB;

    if (pesoProyectado > this.LIMITE_MB) {
      Swal.fire({
        title: 'Límite de peso excedido',
        text: `No puedes agregar este archivo. El total superaría los 50 MB permitidos (Total actual: ${pesoActualMB.toFixed(2)} MB).`,
        icon: 'error'
      });
      doc.seleccionado = false;
      checkbox.checked = false; // Revertimos el check visualmente
      return; // Detenemos la ejecución aquí
    }

    // 2. VALIDACIÓN DE ESTADO (¿Ya tiene OCR o Parámetros?)
    if (doc.ocr_status === 'INDEXADO' || doc.param_status === 'INDEXADO') {
      Swal.fire({
        title: '¿Procesar de nuevo?',
        text: `El documento "${doc.nombre}" ya tiene datos generados. ¿Desea incluirlo de todas formas?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, incluir',
        cancelButtonText: 'No, omitir',
        allowOutsideClick: false
      }).then((result) => {
        if (result.isConfirmed) {
          doc.seleccionado = true;
        } else {
          doc.seleccionado = false;
          checkbox.checked = false;
        }
      });
    } else {
      // Si no está indexado y pasó la prueba de peso, se selecciona normal
      doc.seleccionado = true;
    }
  } else {
    // Si el usuario está desmarcando, simplemente lo hacemos
    doc.seleccionado = false;
  }
}

// 2. SELECCIONAR TODO CON FILTRO


// En tu archivo .ts
obtenerTotalSeleccionados(): number {
  if (!this.documentos) return 0;
  return this.documentos.filter(d => d.seleccionado).length;
}


// 1. Función para seleccionar todos los documentos de la tabla
seleccionarTodo(event: any) {
  const isChecked = event.target.checked;

  if (!isChecked) {
    // Si desmarca el principal, desmarcamos todos sin preguntar
    this.documentos.forEach(d => d.seleccionado = false);
    return;
  }

  // Verificamos si hay documentos que ya estén procesados en el grupo
  const hayProcesados = this.documentos.some(d => d.ocr_status === 'INDEXADO' || d.param_status === 'INDEXADO');

  if (hayProcesados) {
    Swal.fire({
      title: 'Documentos ya procesados',
      text: 'Varios documentos seleccionados ya tienen OCR o Parámetros. ¿Desea procesarlos de nuevo?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Sí, procesar todos',
      cancelButtonText: 'No, solo los pendientes'
    }).then((result) => {
      if (result.isConfirmed) {
        // Opción SÍ: Selecciona TODO
        this.documentos.forEach(d => d.seleccionado = true);
      } else {
        // Opción NO: Solo selecciona los que NO están indexados
        this.documentos.forEach(d => {
          if (d.ocr_status === 'NO INDEXADO' && d.param_status === 'NO INDEXADO') {
            d.seleccionado = true;
          } else {
            d.seleccionado = false;
          }
        });
      }
    });
  } else {
    // Si ninguno está procesado, seleccionamos todos normal
    this.documentos.forEach(d => d.seleccionado = true);
  }
}

// 2. Función para contar cuántos están marcados (Corrigiendo el error TS2339)
totalSeleccionados(): number {
  if (!this.documentos) return 0;
  return this.documentos.filter(d => d.seleccionado).length;
}

  // --- Métodos de Interfaz ---

  // ... (tus imports y decorador se mantienen igual)

async procesarOCR() {
  const seleccionados = this.documentos.filter(d => d.seleccionado);
  
  if (seleccionados.length === 0) {
    Swal.fire('Atención', 'Selecciona al menos un documento', 'warning');
    return;
  }

  const result = await Swal.fire({
    title: '¿Iniciar Procesamiento?',
    text: `Se analizarán ${seleccionados.length} archivos.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, empezar'
  });

  if (result.isConfirmed) {
    this.ejecutarProcesoUnoPorUno(seleccionados);
  }
}

async ejecutarProcesoUnoPorUno(lista: any[]) {
  const total = lista.length;
  let exitososOCR = 0;
  let exitososParams = 0;

  // 1. Mostrar SweetAlert con barra de progreso
  Swal.fire({
    title: 'Procesando OCR Secuencial',
    html: `
      <div class="mt-3">
        <p id="progreso-texto">Preparando...</p>
        <div class="progress mb-2" style="height: 20px;">
          <div id="progreso-barra" class="progress-bar progress-bar-striped progress-bar-animated bg-success" style="width: 0%">0%</div>
        </div>
        <div class="alert alert-light" style="border: 1px dashed #ccc;">
          <small id="archivo-actual">Esperando...</small>
        </div>
      </div>
    `,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => { Swal.showLoading(); }
  });

  const progresoTexto = document.getElementById('progreso-texto');
  const progresoBarra = document.getElementById('progreso-barra');
  const archivoActual = document.getElementById('archivo-actual');

  // 2. Bucle secuencial (uno por uno)
  for (let i = 0; i < total; i++) {
    const doc = lista[i];
    const porcentaje = Math.round(((i + 1) / total) * 100);

    // Actualizar Interfaz
    if (progresoTexto) progresoTexto.innerText = `Documento ${i + 1} de ${total}`;
    if (progresoBarra) {
      progresoBarra.style.width = `${porcentaje}%`;
      progresoBarra.innerText = `${porcentaje}%`;
    }
    if (archivoActual) archivoActual.innerText = `Analizando: ${doc.nombre || doc.nombre_archivo || 'Archivo ' + (i+1)}`;

    try {
      // MAPEANDO EL ID CORRECTO: Intentamos todas las variantes posibles
      const idReal = doc.id_documento || doc.id || doc.idDocumento;

      // CONFIGURACIÓN DEL PAYLOAD PARA LARAVEL
      const payload = {
        id_documento: idReal,
        idSerie: this.idSerie,
        id_empresa: this.ID_EMPRESA,
        usuario_id: this.usuario_id,
        solo_texto: this.opciones.soloTexto || this.opciones.ambos,
        solo_params: this.opciones.soloParametros || this.opciones.ambos
      };

      // DEBUG: Verifica en la consola (F12) que id_documento NO sea undefined
      console.log(`Enviando Doc ${i+1}:`, payload);

      // 3. Llamada al servicio
      const resp: any = await this.seccionesService.indexacionOCR(payload).toPromise();

      // Contabilizar éxitos basados en la respuesta de tu controlador
      if (resp.ocr_success || resp.status === 'success') exitososOCR++;
      if (resp.params_success || resp.parametros_success) exitososParams++;

    } catch (error) {
      console.error(`Error procesando documento:`, doc);
    }
  }

  // 4. Resultado Final y Recarga de Tabla
  Swal.fire({
    icon: 'success',
    title: 'Proceso Masivo Terminado',
    html: `
      <div class="text-start">
        <p>Documentos analizados: <b>${total}</b></p>
        <ul>
          <li>Textos indexados: <span class="text-success">${exitososOCR}</span></li>
          <li>Parámetros detectados: <span class="text-primary">${exitososParams}</span></li>
        </ul>
      </div>
    `,
    confirmButtonText: 'Actualizar Tabla'
  }).then(() => {
    // Esto hará que las banderas negras cambien a verde en la tabla principal
    this.cargarDocumentosAlInicio(this.paginaActual);
  });
}

// Estos se quedan igual para que funcionen los switches
toggleAmbos(event: any) {
  const marcado = event.target.checked;
  if (marcado) {
    this.opciones.soloTexto = true;
    this.opciones.soloParametros = true;
  } else {
    this.opciones.soloTexto = false;
    this.opciones.soloParametros = false;
  }
}

// Opcional: Si el usuario desmarca uno individual, desmarcar "Ambos" automáticamente
verificarEstadoAmbos() {
  if (!this.opciones.soloTexto || !this.opciones.soloParametros) {
    this.opciones.ambos = false;
  } else if (this.opciones.soloTexto && this.opciones.soloParametros) {
    this.opciones.ambos = true;
  }
}

toggleIndividual() {
  this.opciones.ambos = (this.opciones.soloTexto && this.opciones.soloParametros);
}

getMensajeBoton(): string {
  if (this.totalSeleccionados() === 0) {
    return 'Debe seleccionar al menos un archivo para procesar.';
  }
  
  if (!this.hayOpcionSeleccionada()) {
    return 'Debe activar al menos un switch de procesamiento (OCR o Parámetros).';
  }
  
  if (this.excedeLimitePeso()) {
    return 'El peso total de los archivos seleccionados excede el límite permitido.';
  }

  return 'Todo listo para iniciar el proceso.';
}
}