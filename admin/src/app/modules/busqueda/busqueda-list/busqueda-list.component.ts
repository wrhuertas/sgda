import { ChangeDetectorRef, Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { BusquedaService } from '../service/busqueda.service';
import { VerDocumentoComponent } from '../ver-documento/ver-documento.component';
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
  if (this.viewActual === 'grafo_sin') {
    if (this.grafoContainer) {
      setTimeout(() => this.renderizarGrafoDinamico(this.grafoContainer, this.resultados), 100);
    }
  } else {
    if (this.grafoContextoContainer) {
      setTimeout(() => this.renderizarGrafoDinamico(this.grafoContextoContainer, this.resultados), 100);
    }
  }
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
      data: { id: docId, label: doc.nombre_archivo.substring(0, 15), color: '#ffc107' }
    });
    nodosYRelaciones.push({ data: { source: 'root', target: docId } });

    // Extraer beneficiarios (Agentes) de los metadatos de VALENCIA GAD o SOLMO
    if (doc.parametros_indexados_values) {
      doc.parametros_indexados_values.forEach((m: any) => {
        const nombre = m['BENEFICIARIO'] || m['Beneficiario'];
        if (nombre) {
          const agId = `ag_${nombre}`;
          if (!nodosYRelaciones.find(n => n.data.id === agId)) {
            nodosYRelaciones.push({ data: { id: agId, label: nombre, color: '#20c997' } });
          }
          nodosYRelaciones.push({ data: { source: docId, target: agId } });
        }
      });
    }
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
        'width': 20,
        'height': 20
      }
    },
    {
      selector: 'edge',
      style: { 'width': 1, 'line-color': '#444', 'curve-style': 'bezier' }
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
  if (this.viewActual === 'grafo_sin') {
    setTimeout(() => this.renderizarGrafoDinamico(this.grafoContainer, this.resultados), 100);
  } else if (this.viewActual === 'grafo_con') {
    setTimeout(() => this.renderizarGrafoDinamico(this.grafoContextoContainer, this.resultados), 100);
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
        this.criterioBusqueda = dataBusqueda.busqueda ? dataBusqueda.busqueda : 'Filtros Avanzados';
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






verDocumento(doc: any) {
  const payload = {
    idDocumento: doc.id_documento,
    idEmpresa: this.id_empresa,
    idSerieSubserie: this.idSubSerie
  };

  Swal.fire({
    title: 'Cargando documento',
    text: 'Por favor espere mientras se procesa el archivo...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  this.busquedaService.obtenerDocumentoPorId(payload).subscribe({
    next: (blob: Blob) => {
      // 1. CERRAR EL SWAL AQUÍ (Ya encontró el archivo)
      Swal.close();

      if (blob.size === 0) {
        this.toast.error('El archivo está vacío.');
        return;
      }

      const urlBlob = URL.createObjectURL(blob);

      // 2. Abrir el visor después de cerrar la carga
      const modalRef = this.modalService.open(VerDocumentoComponent, {
        size: 'xl',
        centered: true
      });

      modalRef.componentInstance.rutaDocumento = urlBlob;

      modalRef.result.finally(() => {
        URL.revokeObjectURL(urlBlob);
      });
    },
    error: (err) => {
      // 3. CERRAR TAMBIÉN EN CASO DE ERROR
      Swal.close();
      console.error('Error al descargar:', err);
      this.toast.error('Error al obtener el documento.');
    }
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
