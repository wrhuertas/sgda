import { ChangeDetectorRef, Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { BusquedaService } from '../service/busqueda.service';
import { DocumentoViewerService } from '../../indexacion-serie/ver-documento/documento-viewer.service';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { BusqueaAvanzadaComponent } from '../busquea-avanzada/busquea-avanzada.component';
import { InfoDocumentoComponent } from '../info-documento/info-documento.component';
import cytoscape from 'cytoscape';

@Component({
  selector: 'app-busqueda-list',
  templateUrl: './busqueda-list.component.html',
  styleUrls: ['./busqueda-list.component.scss']
})
export class BusquedaListComponent {
 

// 1. Declaraciones correctas al inicio de la clase
@ViewChild('grafoContainer') grafoContainer!: ElementRef;
@ViewChild('grafoContextoContainer') grafoContextoContainer!: ElementRef;

  texto: string = '';
  resultados: any[] = [];
  timeout: any = null;
  infoSeleccionada: any = null;
mostrarModalInfo: boolean = false;
 usuario_id!: number;
  id_empresa!: number;
  proyectos: any[] = [];
  
  idSubSerie: number | null = null;
  viewActual: 'tabla' | 'grafo_sin' | 'grafo_con' = 'tabla';
  busquedaRealizada: boolean = false;

  /** Documento sobre el que se arma el grafo; null = panorama de la búsqueda */
  documentoGrafo: any = null;

  
  paginaActual: number = 1; // Si prefieres mantener la tilde, cámbiala abajo
total: number = 0;        // Faltaba esta
porPagina: number = 45;   // Faltaba esta
Math = Math;
criterioBusqueda: string = '';

  constructor(
    private busquedaService: BusquedaService,
    private cdr: ChangeDetectorRef,
    public modalService: NgbModal,
     private toast: ToastrService,
    private documentoViewer: DocumentoViewerService,
  ) {}

  ngAfterViewInit() {
    // IMPORTANTE: El setTimeout da un respiro a Angular para renderizar el panel derecho
  
  }

    ngOnInit(): void {


    const user = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('Usuario cargado manualmente:', user);

  // ID del usuario (si existe)
  this.usuario_id = user.id ?? null; 
  console.log('Usuario logeado:', this.usuario_id);

  // ID de la empresa
  if (user && user.id_empresa != null) {
    this.id_empresa = user.id_empresa;
    console.log('ID Empresa del usuario logeado:', this.id_empresa);
  } else {
    console.error('No se pudo obtener el id_empresa del usuario.');
  }


  this.cargarProyectos();
  }
  cargarProyectos() {

    if (!this.id_empresa) {
      console.error('ID empresa no definido');
      return;
    }
  
    this.busquedaService.configProyectos(this.id_empresa)
      .subscribe((resp: any) => {
        console.log("PROYECTOS:", resp.proyectos);
        this.proyectos = resp.proyectos;
      });
  }


// 2. Método de actualización que reemplaza a los borrados
actualizarVistas() {
  const contenedor = this.contenedorActivo();
  if (!contenedor) { return; }

  setTimeout(() => this.dibujarGrafo(contenedor), 100);
}

/** El canvas de la vista que se está mostrando */
private contenedorActivo(): ElementRef | null {
  return this.viewActual === 'grafo_sin'
    ? (this.grafoContainer || null)
    : (this.grafoContextoContainer || null);
}

/**
 * Dibuja el grafo del documento elegido; si todavía no se eligió ninguno,
 * muestra el panorama general de la búsqueda.
 */
private dibujarGrafo(contenedor: ElementRef) {
  if (this.documentoGrafo) {
    this.renderizarGrafoDocumento(contenedor, this.documentoGrafo);
  } else {
    this.renderizarGrafoDinamico(contenedor, this.resultados);
  }
}

/**
 * Arma el grafo alrededor de un documento: de dónde cuelga, con qué datos
 * está indexado y qué otros documentos de la búsqueda comparten esos datos.
 */
renderizarGrafoDocumento(elemento: ElementRef, doc: any) {
  if (!elemento || !doc) { return; }

  const elementos: any[] = [];
  const puestos = new Set<string>();

  const nodo = (id: string, label: string, color: string, tipo: string) => {
    if (puestos.has(id)) { return; }
    puestos.add(id);
    elementos.push({ data: { id, label, color, tipo } });
  };

  const arista = (origen: string, destino: string, etiqueta: string = '') => {
    const id = `e_${origen}__${destino}`;
    if (puestos.has(id)) { return; }
    puestos.add(id);
    elementos.push({ data: { id, source: origen, target: destino, label: etiqueta } });
  };

  // 🔸 El documento elegido, en el centro
  const docId = `doc_${doc.id_documento}`;
  nodo(docId, this.recortar(doc.nombre_archivo, 24), '#ffc107', 'principal');

  // 🔸 De dónde cuelga. Todo se cuelga del documento, que es el eje: si se
  // encadenara sección › subsección › serie, la serie terminaría siendo el
  // nodo fuerte del dibujo y el documento quedaría de costado.
  const serie = doc.serie;
  const subseccion = serie?.proyecto;
  const seccion = subseccion?.parent;

  if (seccion?.nombre) {
    const id = `sec_${seccion.id_proyecto ?? seccion.nombre}`;
    nodo(id, this.recortar(seccion.nombre, 22), '#6610f2', 'funcion');
    arista(docId, id, 'sección');
  }

  if (subseccion?.nombre) {
    const id = `sub_${subseccion.id_proyecto ?? subseccion.nombre}`;
    nodo(id, this.recortar(subseccion.nombre, 22), '#6610f2', 'funcion');
    arista(docId, id, 'subsección');
  }

  if (serie?.nombre) {
    const id = `ser_${serie.id_serie ?? serie.nombre}`;
    nodo(id, this.recortar(serie.nombre, 22), '#0d6efd', 'serie');
    arista(docId, id, 'serie');
  }

  // 🔸 Ubicación física, si la tiene
  if (doc.nro_caja) {
    const id = `caja_${doc.nro_caja}`;
    nodo(id, `Caja ${doc.nro_caja}`, '#fd7e14', 'ubicacion');
    arista(docId, id, 'ubicado en');
  }

  // 🔸 Datos con los que está indexado
  const metadatos = this.metadatosDe(doc);

  metadatos.forEach((m) => {
    const id = this.idValor(m.nombre, m.valor);
    nodo(id, `${m.nombre}: ${this.recortar(m.valor, 18)}`, '#20c997', 'agente');
    arista(docId, id, m.nombre);
  });

  // 🔸 Otros documentos de la búsqueda que comparten algo con este
  const relacionados = this.documentosRelacionados(doc, metadatos);

  relacionados.forEach(({ otro, motivo }) => {
    const otroId = `doc_${otro.id_documento}`;
    nodo(otroId, this.recortar(otro.nombre_archivo, 20), '#adb5bd', 'documento');

    // La arista sale del documento elegido: lo que se quiere leer es "este
    // documento se relaciona con aquel, y por qué"
    arista(docId, otroId, motivo);
  });

  const grafo = cytoscape({
    container: elemento.nativeElement,
    elements: elementos,
    style: this.obtenerEstiloGrafo(),
    // Concéntrico y no 'cose' para que el documento quede fijo en el medio y
    // todo lo demás se acomode a su alrededor
    layout: {
      name: 'concentric',
      concentric: (nodo: any) => (nodo.data('tipo') === 'principal' ? 10 : 1),
      levelWidth: () => 1,
      minNodeSpacing: 70,
      animate: true,
      padding: 40
    }
  });

  // Al tocar otro documento el grafo se rearma alrededor de ese
  grafo.on('tap', 'node', (evento: any) => {
    const id = evento.target.id();
    if (!id.startsWith('doc_') || id === docId) { return; }

    const elegido = this.resultados.find(
      (r) => `doc_${r.id_documento}` === id
    );

    if (elegido) { this.seleccionarDocumentoGrafo(elegido); }
  });
}

/**
 * Busca en los resultados otros documentos que compartan la serie o alguno
 * de los valores indexados del documento elegido.
 */
private documentosRelacionados(doc: any, metadatos: { nombre: string, valor: string }[]) {
  const porDato: { otro: any, motivo: string }[] = [];
  const porSerie: { otro: any, motivo: string }[] = [];

  const idSerie = doc.serie?.id_serie ?? doc.id_serie_subserie;

  // Mapa clave -> nombre del parámetro, para poder decir por cuál coinciden
  const clavesPropias = new Map<string, string>();
  metadatos.forEach((m) => clavesPropias.set(this.idValor(m.nombre, m.valor), m.nombre));

  this.resultados.forEach((otro) => {
    if (!otro || otro.id_documento === doc.id_documento) { return; }

    const compartidos: string[] = [];

    this.metadatosDe(otro).forEach((m) => {
      const nombre = clavesPropias.get(this.idValor(m.nombre, m.valor));
      if (nombre && !compartidos.includes(nombre)) {
        compartidos.push(nombre);
      }
    });

    if (compartidos.length > 0) {
      porDato.push({ otro, motivo: 'comparte ' + compartidos.join(', ') });
      return;
    }

    // Si no comparten datos, al menos estar en la misma serie los relaciona
    const serieOtro = otro.serie?.id_serie ?? otro.id_serie_subserie;
    if (idSerie && serieOtro === idSerie) {
      porSerie.push({ otro, motivo: 'misma serie' });
    }
  });

  // Los que comparten datos indexados importan más que los simples vecinos
  // de serie. Se acota el total porque con demasiados no se lee nada.
  return [...porDato, ...porSerie].slice(0, 12);
}

/** Elige el documento sobre el que se arma el grafo */
seleccionarDocumentoGrafo(doc: any) {
  this.documentoGrafo = doc;

  const contenedor = this.contenedorActivo();
  if (!contenedor) { return; }

  this.cdr.detectChanges();
  setTimeout(() => this.renderizarGrafoDocumento(contenedor, doc), 50);
}

/** Vuelve al grafo general de la búsqueda */
limpiarDocumentoGrafo() {
  this.documentoGrafo = null;

  const contenedor = this.contenedorActivo();
  if (!contenedor) { return; }

  this.cdr.detectChanges();
  setTimeout(() => this.renderizarGrafoDinamico(contenedor, this.resultados), 50);
}

/**
 * Devuelve los parámetros indexados que tienen valor.
 * El campo puede venir como arreglo o como texto JSON codificado más de una
 * vez, según cómo se haya guardado.
 */
metadatosDe(doc: any): { nombre: string, valor: string }[] {
  let lista: any = doc?.metadatos ?? doc?.parametros_indexados_values;

  for (let i = 0; i < 3 && typeof lista === 'string'; i++) {
    try {
      lista = JSON.parse(lista);
    } catch (e) {
      return [];
    }
  }

  if (!Array.isArray(lista)) { return []; }

  return lista
    .filter((p: any) => p && p.nombre && p.valor !== null && String(p.valor).trim() !== '')
    .map((p: any) => ({
      nombre: String(p.nombre).trim(),
      valor: String(p.valor).trim()
    }));
}

/** Clave común para un par nombre/valor, así dos documentos caen en el mismo nodo */
private idValor(nombre: string, valor: string): string {
  return `val_${nombre.toUpperCase()}_${valor.toUpperCase()}`;
}

private recortar(texto: any, largo: number): string {
  const limpio = String(texto ?? '').trim();
  return limpio.length > largo ? limpio.substring(0, largo) + '…' : limpio;
}

// 3. El nuevo motor del grafo (Asegúrate de que el nombre sea este)
renderizarGrafoDinamico(elemento: ElementRef, datos: any[]) {
  if (!elemento || !datos || datos.length === 0) return;

  const nodosYRelaciones: any[] = [];
  
  // Nodo central basado en tu búsqueda actual (Marzo 2026)
  nodosYRelaciones.push({
    data: { id: 'root', label: `BUSQUEDA: ${this.texto}`, color: '#6610f2' }
  });

  datos.forEach(doc => {
    const docId = `doc_${doc.id_documento}`;

    // Nodo del Documento (RECORD)
    nodosYRelaciones.push({
      data: { id: docId, label: this.recortar(doc.nombre_archivo, 15), color: '#ffc107', tipo: 'documento' }
    });
    nodosYRelaciones.push({ data: { source: 'root', target: docId } });

    // Los valores indexados se comparten entre documentos: si dos coinciden
    // caen en el mismo nodo y ahí se ve la relación
    this.metadatosDe(doc).forEach((m) => {
      const agId = this.idValor(m.nombre, m.valor);

      if (!nodosYRelaciones.find(n => n.data.id === agId)) {
        nodosYRelaciones.push({
          data: { id: agId, label: this.recortar(m.valor, 18), color: '#20c997', tipo: 'agente' }
        });
      }

      nodosYRelaciones.push({ data: { source: docId, target: agId } });
    });
  });

  cytoscape({
    container: elemento.nativeElement,
    elements: nodosYRelaciones,
    style: this.obtenerEstiloGrafo(),
    layout: { name: 'cose', animate: true }
  });
}

// Diccionario para nombres amigables
public nombresAmigables: { [key: string]: string } = {
  'nombre_archivo': 'Nombre del Expediente',
  'titulo': 'Título',
  'observaciones': 'Observaciones',
  'datos_ocr': 'Dentro del Documento',
  'numero_documento': 'Nro. Documento',
  'codigo_documento': 'Código',
  'parametros_indexados_values': 'Metadatos',
  'nro_caja': 'Caja',
  'nro_tomo': 'Tomo',
  'nro_carpeta_fisica': 'Carpeta Física'
};

// 4. El estilo que le faltaba al compilador
obtenerEstiloGrafo(): any[] {
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'color': '#fff',
        'font-size': '10px',
        'text-valign': 'bottom',
        'text-margin-y': 6,
        'text-wrap': 'wrap',
        'text-max-width': '120px',
        'width': 20,
        'height': 20
      }
    },
    // El documento elegido se destaca del resto
    {
      selector: 'node[tipo = "principal"]',
      style: {
        'width': 44,
        'height': 44,
        'font-size': '13px',
        'font-weight': 'bold',
        'border-width': 3,
        'border-color': '#fff'
      }
    },
    {
      selector: 'node[tipo = "serie"], node[tipo = "funcion"]',
      style: { 'width': 26, 'height': 26, 'shape': 'round-rectangle' }
    },
    {
      selector: 'node[tipo = "ubicacion"]',
      style: { 'shape': 'diamond', 'width': 24, 'height': 24 }
    },
    {
      selector: 'edge',
      style: {
        'width': 1,
        'line-color': '#444',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '8px',
        'color': '#8c9199',
        'text-rotation': 'autorotate'
      }
    }
  ];
}
  

  buscarAuto() {
  clearTimeout(this.timeout);

  // espera 400 ms antes de buscar
  this.timeout = setTimeout(() => {
    if (this.texto.trim().length > 0) {
      this.buscar();
    } else {
      this.resultados = [];
    }
  }, 400);
}


buscar(page: any = 1) {
  // 1. SI ES ELIPSIS '...', NO HACEMOS NADA Y SALIMOS
  if (page === '...') return;

  // 2. CONVERTIMOS A NÚMERO POR SEGURIDAD
  const pageNumber = parseInt(page, 10) || 1;
  this.paginaActual = pageNumber; 
  if (pageNumber === 1) {
    this.limpiarEstadoBusqueda();
    this.criterioBusqueda = this.texto; // <-- Guardamos el texto simple
  }

  Swal.fire({
    title: 'Cargando documentos...',
    html: `<img src="assets/icons/pdf.png" width="50" style="opacity:0.8;"><p style="margin-top:10px; color:#555;">Espere por favor...</p>`,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => { Swal.showLoading(); }
  });

  const data = {
    texto: this.texto,
    id_empresa: this.id_empresa
  };

  // Usamos pageNumber (ya limpio) para el servicio
  this.busquedaService.buscarDocumentos(data, pageNumber)
    .subscribe({
      next: (resp) => {
        this.resultados = resp.data;
        this.total = resp.total;           
        
        // Sincronizamos con lo que devuelve el backend
        this.paginaActual = resp.current_page; 
        this.porPagina = resp.per_page;

        this.busquedaRealizada = true;
        
        // Solo cambiamos a vista tabla si es la primera búsqueda
        if (pageNumber === 1 && !this.busquedaRealizada) {
          this.viewActual = 'tabla';
        }

        this.resultados.forEach((item) => {
          if (item.parametros_indexados_values && typeof item.parametros_indexados_values === 'string') {
            try {
              item.metadatos = JSON.parse(item.parametros_indexados_values);
            } catch (e) {
              item.metadatos = [];
            }
          } else {
            item.metadatos = item.parametros_indexados_values || [];
          }
        });

        this.cdr.detectChanges();
        Swal.close();
      },
      error: (err) => {
        console.error("Error:", err);
        Swal.close();
        this.toast.error('Error al cargar documentos');
      }
    });
}



// En tu archivo .ts, dentro de la clase

// Esta función genera el arreglo de números y elipsis (...)
get paginasAmostrar(): (number | string)[] {
  const totalPaginas = Math.ceil(this.total / this.porPagina);
  const paginaActual = this.paginaActual;
  const rango = 1; // Cuántos números mostrar a los lados de la actual (1 o 2 es lo ideal)
  const paginas: (number | string)[] = [];

  // Si no hay páginas, devolver vacío
  if (totalPaginas <= 0) return [];

  // Lógica para decidir qué números mostrar
  for (let i = 1; i <= totalPaginas; i++) {
    if (
      i === 1 || // Siempre mostrar la primera
      i === totalPaginas || // Siempre mostrar la última
      (i >= paginaActual - rango && i <= paginaActual + rango) // Mostrar rango alrededor de la actual
    ) {
      paginas.push(i);
    } else if (i === paginaActual - rango - 1 || i === paginaActual + rango + 1) {
      // Añadir elipsis si estamos justo fuera del rango
      paginas.push('...');
    }
  }

  // Eliminar duplicados de elipsis consecutivos (por seguridad)
  return paginas.filter((item, index) => {
    return index === 0 || item !== '...' || paginas[index - 1] !== '...';
  });
}

obtenerContexto(doc: any): string {
  if (!this.texto || this.texto.trim().length === 0) return '';

  const busqueda = this.texto.toLowerCase().trim();
  const hallazgos: string[] = [];

  // 1. Escaneo de campos de primer nivel
  const camposPrincipales = [
    { label: 'Archivo', valor: doc.nombre_archivo },
    { label: 'Título', valor: doc.titulo },
    { label: 'Doc #', valor: doc.numero_documento }
  ];

  camposPrincipales.forEach(c => {
    if (c.valor && c.valor.toString().toLowerCase().includes(busqueda)) {
      hallazgos.push(this.crearSnippet(c.label, c.valor.toString(), busqueda));
    }
  });

  // 2. ESCANEO DE METADATOS (Aquí es donde está tu información)
  // Según tu objeto, parametros_indexados_values es un Array: [ {clave: valor}, ... ]
  if (doc.parametros_indexados_values && Array.isArray(doc.parametros_indexados_values)) {
    doc.parametros_indexados_values.forEach((obj: any) => {
      // Extraemos la clave y el valor de cada objeto del array
      Object.entries(obj).forEach(([clave, valor]) => {
        if (valor && valor.toString().toLowerCase().includes(busqueda)) {
          // Limpiamos la clave (ej: de "DESCRIPCI\u00d3N..." a "DESCRIPCIÓN")
          const labelLimpio = clave.replace(/\\u[0-9a-fA-F]{4}/g, (match) => JSON.parse(`"${match}"`));
          hallazgos.push(this.crearSnippet(labelLimpio, valor.toString(), busqueda));
        }
      });
    });
  }

  // 3. Fallback: Si no hay hallazgos pero el registro existe, es por campos generales
  return hallazgos.length > 0 
    ? hallazgos.join('<br>') 
    : '<span class="text-muted">Coincidencia en metadatos generales</span>';
}

// Mantenemos la función de ayuda para el recorte
private crearSnippet(label: string, texto: string, busqueda: string): string {
  const index = texto.toLowerCase().indexOf(busqueda);
  const margen = 30;
  const inicio = Math.max(0, index - margen);
  const fin = Math.min(texto.length, index + busqueda.length + margen);
  
  let snippet = texto.substring(inicio, fin);
  if (inicio > 0) snippet = '...' + snippet;
  if (fin < texto.length) snippet = snippet + '...';

  // Retornamos el label en negrita para identificar de dónde viene
  return `<span class="badge-source">${label}:</span> ${snippet}`;
}









obtenerContenidoLimpio(doc: any): string {
  if (!this.texto || this.texto.trim().length === 0) return '';

  const busqueda = this.texto.toLowerCase().trim();
  const extractos: string[] = [];

  // 1. Buscamos en campos principales (sin etiquetas)
  const valoresPrincipales = [doc.nombre_archivo, doc.titulo, doc.observaciones, doc.numero_documento];
  
  valoresPrincipales.forEach(valor => {
    if (valor && valor.toString().toLowerCase().includes(busqueda)) {
      extractos.push(this.crearSnippetLimpio(valor.toString(), busqueda));
    }
  });

  // 2. Buscamos en metadatos (sin etiquetas)
  if (doc.parametros_indexados_values && Array.isArray(doc.parametros_indexados_values)) {
    doc.parametros_indexados_values.forEach((obj: any) => {
      Object.values(obj).forEach((valor: any) => {
        if (valor && valor.toString().toLowerCase().includes(busqueda)) {
          extractos.push(this.crearSnippetLimpio(valor.toString(), busqueda));
        }
      });
    });
  }

  // Retornamos los trozos unidos por espacio o puntos suspensivos
  return extractos.length > 0 ? extractos.join(' ... ') : 'Sin descripción adicional';
}

// Versión del snippet que solo devuelve el texto recortado
private crearSnippetLimpio(texto: string, busqueda: string): string {
  const index = texto.toLowerCase().indexOf(busqueda);
  const margen = 40;
  const inicio = Math.max(0, index - margen);
  const fin = Math.min(texto.length, index + busqueda.length + margen);
  
  let snippet = texto.substring(inicio, fin);
  if (inicio > 0) snippet = '...' + snippet;
  if (fin < texto.length) snippet = snippet + '...';

  return snippet;
}

// Cambia el nombre de la función para que el HTML la encuentre
cambiarVista(vista: 'tabla' | 'grafo_sin' | 'grafo_con') {
  this.viewActual = vista;

  // Ejecutamos la lógica de los grafos si no es la vista de tabla
  if (this.viewActual !== 'tabla') {
    setTimeout(() => {
      const contenedor = this.contenedorActivo();
      if (contenedor) { this.dibujarGrafo(contenedor); }
    }, 100);
  }
}

  getArchivo(archivo_url: string) {
    try {
      const arr = JSON.parse(archivo_url);
      return arr[0];
    } catch (e) {
      return archivo_url;
    }
  }
  private limpiarEstadoBusqueda() {
    this.resultados = [];
    this.total = 0;
    this.busquedaRealizada = false;
    this.criterioBusqueda = ''; // <-- Limpiar también
    // El documento del grafo ya no está entre los resultados nuevos
    this.documentoGrafo = null;
  }

  buscarAvanzado() {
    const modalRef = this.modalService.open(BusqueaAvanzadaComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
  
    modalRef.componentInstance.titulo = "Búsqueda Avanzada";
    modalRef.componentInstance.proyectos = this.proyectos;
  
    modalRef.result.then(
      (dataBusqueda: any) => {
        if (!dataBusqueda) return;
        this.limpiarEstadoBusqueda();
        this.texto = '';
        // Se muestra el tipo de documento cuando la búsqueda vino de esa pestaña
        this.criterioBusqueda = dataBusqueda.busqueda
          ? dataBusqueda.busqueda
          : (dataBusqueda.tipo_documento || 'Filtros Avanzados');
        // 1. Mostrar el mismo Swal de carga que la búsqueda normal
        Swal.fire({
          title: 'Cargando documentos...',
          html: `<img src="assets/icons/pdf.png" width="50" style="opacity:0.8;"><p style="margin-top:10px; color:#555;">Espere por favor...</p>`,
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => { Swal.showLoading(); }
        });
  
        // 2. Llamar al servicio de búsqueda avanzada
        this.busquedaService.buscarAvanzado(dataBusqueda).subscribe({
          next: (resp: any) => {
            // 3. Sincronizar resultados y paginación
            this.resultados = resp.data || [];
            this.total = resp.total;
            this.paginaActual = resp.current_page;
            this.porPagina = resp.per_page;
            
            this.busquedaRealizada = true;
  
            // 4. Cambiar vista si es necesario
            if (!this.viewActual || this.viewActual !== 'tabla') {
              this.viewActual = 'tabla';
            }
  
            // 5. Mismo parseo de metadatos (el bucle forEach)
            this.resultados.forEach((item: any) => {
              if (item.parametros_indexados_values && typeof item.parametros_indexados_values === 'string') {
                try {
                  item.metadatos = JSON.parse(item.parametros_indexados_values);
                } catch (e) {
                  item.metadatos = [];
                }
              } else {
                item.metadatos = item.parametros_indexados_values || [];
              }
            });
  
            // 6. Refrescar UI y cerrar SweetAlert
            this.cdr.detectChanges();
            Swal.close();
          },
          error: (err) => {
            console.error("Error en búsqueda avanzada:", err);
            Swal.close();
            this.toast.error('Error al realizar la búsqueda avanzada');
          }
        });
      },
      () => {
        console.warn('Modal cerrado sin acción');
      }
    );
  }





verInfo(doc: any) {
  // 1. Abrimos el modal usando el componente VerDocumentoComponent
  // (Asegúrate de que este sea el nombre correcto del componente que muestra la info)
  const modalRef = this.modalService.open(InfoDocumentoComponent, { 
    centered: true, 
    size: 'xl',
    backdrop: 'static' // Opcional: evita que se cierre al hacer clic fuera
  });

  // 2. Pasamos los datos que el componente hijo necesita
  // Importante: Estos nombres deben existir como @Input() en el componente hijo
  modalRef.componentInstance.idDocumento = doc.id_documento;
  modalRef.componentInstance.idEmpresa = this.id_empresa;

  // 3. (Opcional) Si el modal emite algún evento al cerrarse o actualizar
  // Por ejemplo, si dentro del modal editas algo y quieres refrescar la búsqueda:
  modalRef.result.then((result) => {
    if (result === 'refresh') {
      this.buscar(); // Refresca la lista actual
    }
  }).catch(() => {
    // Modal descartado
  });
}






/**
 * Abre el mismo visor del expediente (el de indexación), pero en modo
 * consulta: se puede ver, navegar y hacer zoom, sin las acciones que
 * modifican el documento.
 */
verDocumento(doc: any) {
  this.documentoViewer.abrirVer({
    idDocumento: doc.id_documento,
    idEmpresa: this.id_empresa,
    idSerieSubserie: doc.id_serie_subserie ?? this.idSubSerie ?? null,
    nombreArchivo: doc.nombre_archivo ?? null,
    soloLectura: true,
    permitirImprimir: false
  });
}

/*
verDocumento(doc: any) {
  const payload = {
    idDocumento: doc.id_documento,   // 👈 CORREGIDO
    idEmpresa: this.id_empresa,
  };

  this.busquedaService.obtenerDocumentoPorId(payload).subscribe({
    next: (resp: any) => {
      if (resp.success && resp.data?.ruta) {
        const modalRef = this.modalService.open(VerDocumentoComponent, {
          size: 'xl',
          centered: true
        });
        modalRef.componentInstance.rutaDocumento = resp.data.ruta;
      } else {
        this.toast.error('No se pudo obtener el documento.');
      }
    },
    error: (err) => {
      console.error('Error al traer documento:', err);
      this.toast.error('Error al obtener el documento.');
    }
  });
}*/



}
