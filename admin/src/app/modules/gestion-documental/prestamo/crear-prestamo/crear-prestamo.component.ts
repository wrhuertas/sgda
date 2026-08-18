import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { PrestamoService } from '../service/prestamo.service';
import Swal from 'sweetalert2';
import { DocumentoViewerService } from 'src/app/modules/indexacion-serie/ver-documento/documento-viewer.service';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as htmlToPdfmake from 'html-to-pdfmake';

(pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;



@Component({
  selector: 'app-crear-prestamo',
  templateUrl: './crear-prestamo.component.html',
})
export class CrearPrestamoComponent implements OnInit {

  @Output() PrestamoC: EventEmitter<any> = new EventEmitter();

  /** 'FISICO' o 'DIGITAL': lo elige el usuario antes de abrir el acta */
  @Input() TIPO_PRESTAMO: string = 'FISICO';

  // Datos principales
  numero_acta: string = 'PRE-2026-000001-M';
  numero_tramite: string = '';
  id_tramite: number | null = null;

  /**
   * Lo que devolvió la búsqueda. Se guarda entero y no sólo el id porque los
   * memorandos vienen sin id_tramite y hay que poder distinguirlos.
   */
  tramiteEncontrado: any = null;
  seccion_id: string = '';
  subseccion_id: string = '';
  serie_id: string = '';
  
  // Buscadores
  search_user: string = '';
  search_doc: string = '';

  // Objetos seleccionados
  usuario_selected: any = null;
  documento_selected: any = null;
  
  // Datos del administrador (Entregado por)
 

  // Control de Devolución
  fecha_devolucion: string = '';
  observaciones: string = '';



  user: any; // Declaras la variable
id_empresa: any;

// Respuesta de DatosLogeado: empresa, proyecto raíz/actual, siglas y firma
datos_logeado: any = null;


// 🚀 Variable para capturar el acta guardada en tiempo real
  id_acta_grabada: number | null = null;


  
  paginaActual: number = 1; // Si prefieres mantener la tilde, cámbiala abajo
total: number = 0;        // Faltaba esta
porPagina: number = 45;   // Faltaba esta
Math = Math;
criterioBusqueda: string = '';


  texto: string = '';
  resultados: any[] = [];
  timeout: any = null;
  infoSeleccionada: any = null;
mostrarModalInfo: boolean = false;
 usuario_id!: number;
  
  idSubSerie: number | null = null;
  viewActual: 'tabla' | 'grafo_sin' | 'grafo_con' = 'tabla'; 
  busquedaRealizada: boolean = false;

  // 🚀 Variable para capturar el acta guardada en tiempo real
  id_prestamo: number | null = null;


  public documentos_visualizar: any[] = [];
  niveles: any[] = [];
  public isLoading: boolean = false;
  
  // VARIABLE PARA EL INPUT ÚNICO
  terminoGeneral: string = ''; 
  
  esNivelSerie: boolean = false; 


  usuarios_list: any[] = [];

  fecha_minima_hoy: string = '';
  
  titulosNiveles = [
    "Seccion Documental",
    "Sub Seccion Documental",
    "Sub Sub Seccion Docuemntal",
    "Serie",
    "Subserie",
    "Sub-subserie"
  ];
  proyectos: any;
  busquedaService: any;

seleccionarNivel(index: number) {
  const nivelActual = this.niveles[index];
  const seleccion = nivelActual.seleccionado;

  // 1. Limpiamos niveles hijos (esto es lo que hace que sea dinámico)
  this.niveles.splice(index + 1);

  if (seleccion) {
    // 2. CARGAR DOCUMENTOS: Si la opción tiene documentos, los mostramos
    // Pero NO nos detenemos aquí, seguimos buscando si hay más niveles
    if (seleccion.documentos && seleccion.documentos.length > 0) {
      this.documentos_visualizar = seleccion.documentos;
    } else {
      this.documentos_visualizar = [];
    }

    // 3. LOGICA DE CASCADA (REPARADA):
    // Buscamos si hay hijos para crear el siguiente SELECT
    let subOpciones = [];
    if (seleccion.subsecciones && seleccion.subsecciones.length > 0) {
      subOpciones = seleccion.subsecciones;
    } else if (seleccion.series && seleccion.series.length > 0) {
      subOpciones = seleccion.series;
    } else if (seleccion.hijos_recursivos && seleccion.hijos_recursivos.length > 0) {
      subOpciones = seleccion.hijos_recursivos;
    }

    // Si encontramos hijos, empujamos el nuevo nivel al array de selects
    if (subOpciones.length > 0) {
      this.niveles.push({
        opciones: subOpciones,
        seleccionado: null
      });
    }
  } else {
    // Si deseleccionan, limpiamos todo
    this.documentos_visualizar = [];
  }
  this.cdr.detectChanges();
}

  /** Abre el memorandum directamente en el visor del sistema */
  verTramite() {
    if (!this.tramiteEncontrado) { return; }

    this.prestamoService.actaMemorandum(
      this.tramiteEncontrado.id_asignacion_tramite ?? null,
      this.tramiteEncontrado.num_documento_interno || this.numero_tramite || ''
    ).subscribe({
      next: (resp: any) => {
        const acta = resp?.acta;

        if (!acta?.ruta) {
          this.toast.info('El memorandum no tiene un documento guardado');
          return;
        }

        if (!acta.base64) {
          this.toast.error('No se encontró el archivo del memorandum en el servidor');
          return;
        }

        // Se abre desde base64 y no por URL: la API está en otro dominio y el
        // navegador bloquea la descarga directa del PDF por CORS.
        this.documentoViewer.abrirVer({
          pdfBase64: acta.base64,
          nombreArchivo: acta.nombre
        });
      },
      error: (err: any) => {
        console.error('Error al obtener el memorandum', err);
        this.toast.error(err?.error?.message || 'No se pudo abrir el memorandum');
      }
    });
  }

  buscarTramite() {
    if (!this.id_empresa || !this.numero_tramite?.trim()) {
      this.toast.info('Ingrese un número de trámite para buscar');
      return;
    }
    
    // Cada búsqueda arranca de cero: si no encuentra, el botón no debe quedar
    this.tramiteEncontrado = null;

    this.prestamoService.buscarTramitePorNumero(this.id_empresa, this.numero_tramite.trim()).subscribe({
      next: (resp: any) => {
        console.log('🔎 Resultado búsqueda trámite:', resp);

        if (resp?.status === 200 && Array.isArray(resp.tramites)) {
          const n = resp.tramites.length;
          
          if (n === 1) {
            // Caso de éxito: Lo encontró perfectamente
            const encontrado = resp.tramites[0];
            this.tramiteEncontrado = encontrado;
            this.id_tramite = encontrado.id_tramite ?? null;

            // Los memorandos no tienen trámite: se guarda el número, que es
            // lo que después identifica al documento en el acta
            this.numero_tramite = encontrado.num_documento_interno
              || encontrado.numero_tramite
              || this.numero_tramite;

            this.toast.success(
              encontrado.es_memorandum
                ? 'Memorandum encontrado y asignado'
                : 'Trámite encontrado y asignado'
            );

          } else if (n > 1) {
            // Múltiples coincidencias: Borramos ID pero DEJAMOS el texto para que el usuario lo edite/refine
            this.id_tramite = null;
            this.toast.info(`Se encontraron ${n} coincidencias. Refine el número para asignar automáticamente.`);
            
          } else {
            // No se encontraron registros: Limpiamos ID y vaciamos el input
            this.id_tramite = null;
            this.numero_tramite = ''; // 👈 Limpia el input text en el HTML
            this.toast.info('No se encontraron trámites con ese número');
          }
        } else {
          // Si el backend responde sin la estructura correcta o estatus inválido
          this.id_tramite = null;
          this.numero_tramite = ''; // 👈 Limpia el input text en el HTML
          this.toast.info('No se encontraron trámites con ese número');
        }
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al buscar trámite', err);
        this.id_tramite = null;
        this.numero_tramite = ''; // 👈 Limpia también si explota el servidor
        this.toast.error('Error al buscar trámite');
        this.cdr.detectChanges();
      }
    });
  }









  // En tu clase CrearPrestamoComponent agrega estas propiedades:
data: any = null;
prestamoData: any = null;
logoEmpresaBase64: string | null = null;
pdfUrl: any = null;


  public filtro_tabla: string = '';
  public documentos_seleccionados: any[] = [];

  // ===== Cuerpo del documento (sección desplegable) =====
  public mostrar_cuerpo: boolean = false;
  public Editor: any = ClassicEditor;
  public contenidoCuerpo: string = '';
  public editorConfig = {
    toolbar: [
      'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
      'indent', 'outdent', '|', 'insertTable', 'undo', 'redo'
    ]
  };

  /** Última cláusula generada: sirve para saber si el usuario la editó a mano */
  private cuerpoGenerado: string = '';

  /** Abre/cierra la sección del cuerpo del documento */
  toggleCuerpo() {
    this.mostrar_cuerpo = !this.mostrar_cuerpo;

    if (this.mostrar_cuerpo) {
      this.actualizarCuerpoDocumento();
    }

    this.cdr.detectChanges();
  }

  /**
   * Rearma la cláusula con los datos actuales del acta.
   *
   * Si el usuario ya la editó a mano no se toca: se compara contra la última
   * versión generada para no pisarle el texto.
   */
  private actualizarCuerpoDocumento() {
    const nuevo = this.armarCuerpoDocumento();

    if (!this.contenidoCuerpo || this.contenidoCuerpo === this.cuerpoGenerado) {
      this.contenidoCuerpo = nuevo;
      this.cuerpoGenerado = nuevo;
    }
  }

  /** Cláusula legal del acta, armada con el custodio, el solicitante y el soporte */
  private armarCuerpoDocumento(): string {
    const custodio = this.user?.full_name || '__________';

    const solicitante = this.usuario_selected
      ? `${this.usuario_selected.name || ''} ${this.usuario_selected.surname || ''}`.trim()
      : '__________';

    const cedula = this.usuario_selected?.n_document || '__________';

    // El soporte lo define la cabecera del acta (físico o digital)
    const soporte = this.TIPO_PRESTAMO === 'DIGITAL' ? 'digital' : 'física';

    // El backend registra todas las actas como préstamo INTERNO
    const calidad = 'INTERNO';

    return `<p>Por medio de la presente, se deja constancia legal de la ejecución del préstamo y entrega-recepción de la documentación ${soporte} detallada en las instalaciones del archivo central. Intervienen en el presente acto, por una parte el/la servidor/a <strong>${custodio}</strong> en calidad de Custodio/Gestor de Archivo, quien realiza la entrega de la información, y por otra parte el/la Sr./Sra. <strong>${solicitante}</strong> con documento de identidad No. <strong>${cedula}</strong>, quien en calidad de <strong>${calidad}</strong> declara recibir a entera satisfacción los expedientes que se detallan a continuación, asumiendo la total custodia, reserva y responsabilidad de su integridad bajo las normativas institucionales vigentes.</p>`;
  }

  constructor(
    public activeModal: NgbActiveModal,
    private toast: ToastrService,
    public prestamoService: PrestamoService,
     private cdr: ChangeDetectorRef,
     public modalService: NgbModal,
     private documentoViewer: DocumentoViewerService,
  ) { }

  ngOnInit(): void { 
    const userData = localStorage.getItem('user');
     if (userData) {
        this.user = JSON.parse(userData);
        this.id_empresa = this.user.id_empresa;

        // Console log para verificar los datos de entrega
        console.log("✅ Datos encontrados para 'Entregado por':", {
            nombre: this.user.full_name,
            cargo: this.user.cargo || 'No definido (usando default)',
            cedula: this.user.cedula || 'No definido (usando ---)'
        });
        this.numeroacta(this.id_empresa);
        this.DatosLogeado(this.user.id);
        this.actualizarCuerpoDocumento();
    } else {
        console.warn("⚠️ No se encontraron datos de usuario en localStorage.");
    }
      // No se llama a cargarProyectos() acá: esa petición traía todos los
      // documentos de la empresa al abrir el modal, antes de buscar nada.




      // 2. Calculamos el día de hoy en formato estricto YYYY-MM-DD
      const hoy = new Date();
      
      // Solución limpia para evitar desfases de zona horaria (UTC vs Local)
      const anio = hoy.getFullYear();
      const mes = String(hoy.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
      const dia = String(hoy.getDate()).padStart(2, '0');
      
      this.fecha_minima_hoy = `${anio}-${mes}-${dia}`;
      
      // Opcional: Puedes preseleccionar el día de hoy por defecto si deseas
      if (!this.fecha_devolucion) {
        this.fecha_devolucion = this.fecha_minima_hoy;
      }
  }

  

 cargarProyectos() {
  console.log('Cargando proyectos para empresa ID:', this.id_empresa);

  if (!this.id_empresa) {
    console.error('Error: id_empresa es', this.id_empresa);
    return;
  }

  this.prestamoService.configProyectos(this.id_empresa)
    .subscribe({
      next: (resp: any) => {
        if (resp.proyectos && resp.proyectos.length > 0) {
          console.log("PROYECTOS RECIBIDOS:");
          console.table(resp.proyectos); 
          
          this.proyectos = resp.proyectos;

          // ✅ CORRECCIÓN CLAVE: Inicializar niveles AQUÍ adentro
          this.niveles = [{ opciones: this.proyectos, seleccionado: null }];
          
          // Forzamos a Angular a detectar que ahora sí hay datos para el select
          this.cdr.detectChanges(); 
        } else {
          console.warn("La respuesta no contiene proyectos:", resp);
        }
      },
      error: (err: any) => { 
        console.error('Error en la petición de proyectos:', err);
      }
    });
}


  /**
   * Trae los datos del usuario logueado (empresa, proyecto raíz/actual, siglas,
   * firma). Es la misma función que usan los módulos de trámites.
   */
  DatosLogeado(id_usuario: number): void {
    if (!id_usuario) { return; }

    this.prestamoService.datosLogeado(id_usuario).subscribe({
      next: (resp: any) => {
        console.log('Logeado:', resp);
        this.datos_logeado = resp || null;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('DatosLogeado - error del servicio:', err);
      }
    });
  }

  numeroacta(id_empresa: number) {
  if (!id_empresa) return;

  this.prestamoService.numeroActa(id_empresa).subscribe({
    next: (resp: any) => {
      console.log('📄 Respuesta numeroActa recibida del backend:', resp);
      
      if (resp && resp.formateado) {
        const y = new Date().getFullYear();
        
        // 🚀 El backend ya calculó el +1, aquí solo armamos el formato visual final
        this.numero_acta = `PRE-${y}-${resp.formateado}-M`;
        
        console.log('✅ Número de acta asignado directamente:', this.numero_acta);
      } else {
        this.toast.error('El servidor no devolvió el formato de memorandum esperado');
      }
      
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error cargando el correlativo de acta:', err);
      this.toast.error('No se pudo cargar el número de memorandum correlativo');
    }
  });
}

  // Incrementa la parte numérica final manteniendo el formato y ceros a la izquierda
  private incrementarActa(valor: string): string {
    if (!valor) return valor;
    // Busca el último bloque de dígitos (ej. ACT-2026-0001 -> captura 0001)
    const match = valor.match(/(\d+)(?!.*\d)/);
    if (!match) {
      // Si no hay dígitos, intentar añadir -0001
      return valor + '-0001';
    }
    const numeroStr = match[1];
    const inicio = match.index ?? (valor.length - numeroStr.length);
    const prefix = valor.slice(0, inicio);
    const ancho = numeroStr.length;
    const numero = parseInt(numeroStr, 10);
    const incrementado = (isNaN(numero) ? 0 : numero + 1).toString().padStart(ancho, '0');
    return prefix + incrementado;
  }

  // Si el valor es solo numérico, arma el formato PRE-YYYY-000000-M
  private formatearConPrefijoSiNecesario(valor: string): string {
    if (!valor) return valor;
    const soloDigitos = /^\d+$/;
    const y = new Date().getFullYear();
    if (soloDigitos.test(valor)) {
      const seq = valor.toString().padStart(6, '0');
      return `PRE-${y}-${seq}-M`;
    }
    return valor;
  }


  


  // 2. Esta función debe llamarse en el (change) de tus selects
onSeleccionCambio(index: number, seleccion: any) {
  // ... (tu lógica actual para manejar los niveles de selects) ...

  // Si lo seleccionado es una Serie (o tiene el array de documentos)
  if (seleccion && seleccion.documentos) {
    this.documentos_visualizar = seleccion.documentos;
    console.log('Documentos cargados para la serie:', this.documentos_visualizar);
  } else if (seleccion && seleccion.hijos_recursivos) {
    // Si seleccionaste una serie que tiene subseries pero quizás no documentos directos
    // podrías decidir si mostrar los documentos de la serie padre o limpiar
    this.documentos_visualizar = seleccion.documentos || [];
  } else {
    this.documentos_visualizar = [];
  }
}


// Esta función devuelve los documentos filtrados y limitados a 10
// Getter para filtrar y limitar a 10
get documentosFiltrados() {
  if (!this.documentos_visualizar) return [];
  
  let filtrados = this.documentos_visualizar;

  if (this.filtro_tabla) {
    const busqueda = this.filtro_tabla.toLowerCase();
    filtrados = filtrados.filter(d => 
      d.nombre_archivo && d.nombre_archivo.toLowerCase().includes(busqueda)
    );
  }

  return filtrados.slice(0, 10);
}

// Manejo del checkbox
toggleSeleccion(doc: any) {
  // Sólo bloquea el préstamo físico: el digital deja libre el expediente
  if (this.bloqueadoPorPrestamo(doc)) {
    this.toast.info(`El documento está prestado en físico en el memorandum ${doc.prestamo?.numero_acta || ''}`);
    return;
  }

  const index = this.documentos_seleccionados.findIndex(d => d.id_documento === doc.id_documento);
  if (index > -1) {
    this.documentos_seleccionados.splice(index, 1);
  } else {
    this.documentos_seleccionados.push(doc);
  }
}



// Cambiamos la firma de la función: quitamos el parámetro id_empresa
buscarUsuario() {
    if (!this.id_empresa) {
        this.toast.error('No hay un ID de empresa seleccionado');
        return;
    }

    if (!this.search_user || this.search_user.trim() === '') {
        this.toast.info('Por favor, ingrese un nombre o cédula');
        return;
    }

    this.prestamoService.buscarusuario(this.id_empresa, this.search_user).subscribe({
        next: (resp: any) => {
            if (resp && resp.usuarios && resp.usuarios.length > 0) {
                // GUARDAMOS TODA LA LISTA para mostrar el menú
                this.usuarios_list = resp.usuarios; 
                this.toast.success(`${resp.usuarios.length} coincidencias encontradas`);
            } else {
                this.usuarios_list = [];
                this.usuario_selected = null;
                this.toast.error('No se encontró ningún usuario');
            }
            this.cdr.detectChanges();
        }
    });
}

seleccionarUsuario(user: any) {
    this.usuario_selected = user; // Asignamos el seleccionado al panel
    this.usuarios_list = [];      // Limpiamos la lista para cerrar el menú
    this.search_user = '';        // Opcional: limpiar el buscador
    this.actualizarCuerpoDocumento(); // La cláusula nombra al solicitante
    this.cdr.detectChanges();
}

/** Abre el visor con el documento de la lista de resultados de la búsqueda */
verDocumento(doc: any) {
    const idDocumento = doc?.id ?? doc?.id_documento ?? null;

    if (!idDocumento) {
        this.toast.error('El documento no tiene un identificador válido');
        return;
    }

    this.documentoViewer.abrirVer({
        idDocumento: idDocumento,
        idEmpresa: this.id_empresa,
        idSerieSubserie: doc?.id_serie ?? null,
        nombreArchivo: doc?.nombre_archivo
    });
}

/** El documento está prestado si la búsqueda lo devolvió con un acta asociada */
estaPrestado(doc: any): boolean {
    return !!doc?.prestamo?.id_prestamo;
}

/** Ubicación topográfica del documento: estantería / fila / caja / carpeta */
ubicacionTopografica(doc: any): string {
    const u = doc?.ubicacion || {};

    const partes = [
        u.estanteria ? `Est. ${u.estanteria}` : null,
        u.fila ? `Fila ${u.fila}` : null,
        u.caja ? `Caja ${u.caja}` : null,
        u.carpeta ? `Carp. ${u.carpeta}` : null
    ].filter(parte => !!parte);

    return partes.length ? partes.join(' / ') : 'Sin ubicación';
}

/** Páginas del documento digitalizado */
paginasDocumento(doc: any): number {
    return doc?.total_paginas ?? doc?.nro_paginas_digitales ?? 0;
}

/** Soporte del acta que tiene el documento: 'fisico' | 'digital' | 'hibrido' */
soportePrestamo(doc: any): string {
    return (doc?.prestamo?.tipo_soporte || 'fisico').toLowerCase();
}

/**
 * Un documento prestado en FÍSICO (o híbrido) salió del archivo: no se puede
 * volver a prestar, ni siquiera en digital, porque el expediente no está.
 * Si el préstamo vigente es DIGITAL el original sigue en su sitio, así que se
 * puede prestar otra vez sin importar el soporte de esta acta.
 */
bloqueadoPorPrestamo(doc: any): boolean {
    if (!this.estaPrestado(doc)) {
        return false;
    }

    return this.soportePrestamo(doc) !== 'digital';
}

/** Texto del badge de la columna Estado documento */
etiquetaEstado(doc: any): string {
    if (!this.estaPrestado(doc)) {
        return 'Libre';
    }

    const soporte = this.soportePrestamo(doc);
    const nombres: any = { fisico: 'Físico', digital: 'Digital', hibrido: 'Híbrido' };

    return `Prestado (${nombres[soporte] || soporte})`;
}

/** Abre el acta de préstamo a la que pertenece el documento */
verActaDelDocumento(doc: any) {
    const prestamo = doc?.prestamo;

    if (!prestamo?.id_prestamo) {
        this.toast.info('El documento no está en ningún memorandum de préstamo');
        return;
    }

    // El acta sólo tiene PDF cuando ya fue firmada; en borrador no hay archivo
    if (!prestamo.tiene_pdf) {
        this.toast.info(`El memorandum ${prestamo.numero_acta || ''} todavía es un borrador y no tiene documento firmado`);
        return;
    }

    Swal.fire({
        title: 'Cargando memorandum...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => { Swal.showLoading(); }
    });

    this.prestamoService.verActaFirmada(prestamo.id_prestamo).subscribe({
        next: (blob: Blob) => {
            // Se pasa en base64 y no por URL: el endpoint responde como descarga
            // y necesita el token, así que el visor no puede pedirlo por su cuenta.
            const reader = new FileReader();

            reader.onloadend = () => {
                try { Swal.close(); } catch {}

                this.documentoViewer.abrirVer({
                    pdfBase64: reader.result as string,
                    nombreArchivo: `Memorandum_${prestamo.numero_acta || prestamo.id_prestamo}.pdf`
                });
            };

            reader.onerror = () => {
                try { Swal.close(); } catch {}
                this.toast.error('No se pudo leer el memorandum descargado');
            };

            reader.readAsDataURL(blob);
        },
        error: (err) => {
            try { Swal.close(); } catch {}
            console.error('Error al obtener el acta del préstamo', err);
            this.toast.error('No se pudo abrir el memorandum del préstamo');
        }
    });
}

  // Esta es la función que te falta:
seleccionarDocumentoParaPrestamo(doc: any) {
    console.log('Documento seleccionado para el acta:', doc);
    
    // Asignamos el documento a la variable de selección
    this.documento_selected = doc;

    // Aquí puedes añadir lógica adicional, como abrir un modal 
    // o mover el documento a una lista de "Documentos a prestar"
    
    this.cdr.detectChanges();
}

 buscarDocumento() {
    if (!this.search_doc) {
        // Si borran el buscador, mostramos todos los de la serie otra vez
        const ultimaSeleccion = this.niveles[this.niveles.length - 1].seleccionado;
        this.documentos_visualizar = ultimaSeleccion ? ultimaSeleccion.documentos : [];
        return;
    }

    // Filtra sobre los documentos que ya están en memoria
    this.documentos_visualizar = this.documentos_visualizar.filter(doc =>
        doc.nombre_archivo.toLowerCase().includes(this.search_doc.toLowerCase()) ||
        (doc.nro_caja && doc.nro_caja.toString().includes(this.search_doc))
    );
}


 private limpiarEstadoBusqueda() {
    this.resultados = [];
    this.total = 0;
    this.busquedaRealizada = false;
    this.criterioBusqueda = ''; // <-- Limpiar también
  }

  buscar(page: any = 1) {
    // 1. SI ES ELIPSIS '...', NO HACEMOS NADA Y SALIMOS
    if (page === '...') return;

    // Sin un dato de búsqueda no se consulta: traería todos los documentos
    if (!this.texto || !this.texto.trim()) {
      this.toast.info('Ingrese un dato para buscar');
      return;
    }

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
    this.prestamoService.buscarDocumentos(data, pageNumber)
  .subscribe({
    next: (resp) => {
      // 1. ASIGNA A LA VARIABLE QUE USA EL GETTER
      this.resultados = resp.data;
      this.documentos_visualizar = resp.data; // <--- ESTA ES LA CLAVE
      
      this.total = resp.total;           
      this.paginaActual = resp.current_page; 
      this.porPagina = resp.per_page;
      this.busquedaRealizada = true;

      if (pageNumber === 1) {
        this.viewActual = 'tabla';
      }

      // 2. PROCESA LOS METADATOS SOBRE LA VARIABLE DE ORIGEN
      this.documentos_visualizar.forEach((item) => {
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









    /**
     * Vista previa del memorandum. Se arma en el navegador con lo que hay en
     * pantalla, así que no hace falta haber grabado el borrador.
     *
     * Orden del documento: logo de la empresa, datos de la empresa debajo y
     * después el cuerpo que se escribe en el editor.
     */
    verDocumentoActual() {
      Swal.fire({
        title: 'Generando vista previa...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => { Swal.showLoading(); }
      });

      this.cargarLogoEmpresa().then((logo) => this.generarVistaPreviaPDF(logo));
    }

    /**
     * Trae el logo de la empresa en base64, que es lo que necesita pdfmake.
     *
     * Se pide al backend en vez de bajarlo por su URL: /storage no manda
     * cabeceras CORS, así que el navegador bloquea el canvas y el logo no sale.
     */
    private cargarLogoEmpresa(): Promise<string | null> {
      const idEmpresa = this.id_empresa || this.datos_logeado?.id_empresa;

      if (!idEmpresa) {
        return Promise.resolve(null);
      }

      return new Promise((resolve) => {
        this.prestamoService.cargarEmpresaVistaPrevia(Number(idEmpresa)).subscribe({
          next: (resp: any) => {
            resolve(resp?.imagen_empresa_base64 || null);
          },
          error: (err: any) => {
            console.warn('No se pudo obtener el logo de la empresa:', err);
            resolve(null);
          }
        });
      });
    }

    /** Arma el PDF y lo abre en el visor del sistema */
    private generarVistaPreviaPDF(logo: string | null) {
      const datos = this.datos_logeado || {};

      // El cuerpo viene del editor en HTML: pdfmake necesita su propio formato
      const cuerpo = (htmlToPdfmake as any)(this.contenidoCuerpo || '', { window });

      const nombreSolicitante = this.usuario_selected
        ? `${this.usuario_selected.name || ''} ${this.usuario_selected.surname || ''}`.trim()
        : 'N/A';

      // Detalle de los documentos que se van marcando en la búsqueda
      const filasDocumentos: any[] = [
        [
          { text: '#', style: 'tableHeader', alignment: 'center' },
          { text: 'ID Sistema / Doc.', style: 'tableHeader' },
          { text: 'Nombre del Archivo Digital / Ruta', style: 'tableHeader' },
          { text: 'Ext.', style: 'tableHeader', alignment: 'center' }
        ]
      ];

      if (this.documentos_seleccionados.length > 0) {
        this.documentos_seleccionados.forEach((doc: any, index: number) => {
          filasDocumentos.push([
            { text: (index + 1).toString(), alignment: 'center', fontSize: 9, margin: [0, 4, 0, 4] },
            { text: doc.numero_documento || `ID-${doc.id_documento}`, fontSize: 9, bold: true, alignment: 'left', margin: [0, 4, 0, 4] },
            {
              text: [
                { text: `${doc.nombre_archivo || 'Sin nombre'}\n`, fontSize: 9, bold: true, color: '#2d3748' },
                { text: doc.ruta_completa || 'Sin ruta registrada', fontSize: 7.5, color: '#718096', italics: true }
              ],
              alignment: 'left',
              margin: [0, 4, 0, 4]
            },
            { text: (doc.tipo_archivo || 'pdf').toUpperCase(), fontSize: 8.5, alignment: 'center', margin: [0, 4, 0, 4], color: '#4a5568' }
          ]);
        });
      } else {
        filasDocumentos.push([
          { text: 'Todavía no se han seleccionado documentos para este memorandum.', colSpan: 4, alignment: 'center', italics: true, fontSize: 9, color: '#e53e3e' },
          {}, {}, {}
        ]);
      }

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [45, 40, 45, 60],
        content: [
          // Encabezado: datos de la empresa a la izquierda, logo a la derecha
          {
            columns: [
              {
                width: '*',
                text: [
                  { text: `${datos.empresa || 'EMPRESA NO IDENTIFICADA'}\n`, bold: true, fontSize: 12, color: '#1a365d' },
                  { text: `RUC: ${datos.ruc_empresa || 'N/A'}\n`, fontSize: 9, color: '#4a5568' },
                  { text: `Dirección: ${datos.direccion_empresa || 'N/A'}\n`, fontSize: 8, color: '#718096' },
                  { text: `Teléfono: ${datos.telefono_empresa || 'N/A'}   ·   ${datos.correo_empresa || 'N/A'}`, fontSize: 8, color: '#718096' }
                ],
                alignment: 'left',
                margin: [0, 5, 0, 0]
              },
              logo
                ? { image: logo, width: 110, alignment: 'right' }
                : { text: '', width: 110 }
            ],
            margin: [0, 0, 0, 8]
          },

          { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 505, y2: 5, lineWidth: 1.5, lineColor: '#1a365d' }] },
          { text: '\n' },

          // Título y número del memorandum
          {
            text: 'MEMORANDUM DE PRÉSTAMO DOCUMENTAL',
            fontSize: 13,
            bold: true,
            alignment: 'center',
            color: '#2d3748'
          },
          {
            text: `No. ${this.numero_acta || 'REG-S/N'}`,
            fontSize: 11,
            bold: true,
            alignment: 'center',
            color: '#e53e3e',
            margin: [0, 2, 0, 10]
          },

          { text: '\n' },

          // 3. Cuerpo del documento
          cuerpo,

          { text: '\n' },

          // 4. Detalle de los documentos seleccionados
          { text: 'DETALLE DE LOS DOCUMENTOS ENTREGADOS:', fontSize: 9.5, bold: true, alignment: 'left', color: '#2d3748', margin: [0, 0, 0, 6] },
          {
            table: {
              headerRows: 1,
              widths: [25, 95, '*', 35],
              body: filasDocumentos
            },
            layout: {
              fillColor: function (rowIndex: number) {
                if (rowIndex === 0) { return '#1a365d'; }
                return (rowIndex % 2 === 0) ? '#f7fafc' : null;
              },
              hLineColor: function () { return '#e2e8f0'; },
              vLineColor: function () { return '#e2e8f0'; }
            }
          },

          { text: '\n\n\n\n' },

          // 5. Firmas de responsabilidad
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: '_____________________________________\n', alignment: 'center', color: '#cbd5e0' },
                  { text: `${this.user?.full_name || 'N/A'}`, bold: true, fontSize: 9, alignment: 'center' },
                  { text: 'ENTREGUÉ CONFORME', fontSize: 8, bold: true, color: '#718096', alignment: 'center', margin: [0, 2, 0, 0] },
                  { text: 'Custodio de Archivo / Gestor', fontSize: 8, color: '#a0aec0', alignment: 'center' }
                ]
              },
              { width: 40, text: '' },
              {
                width: '*',
                stack: [
                  { text: '_____________________________________\n', alignment: 'center', color: '#cbd5e0' },
                  { text: nombreSolicitante, bold: true, fontSize: 9, alignment: 'center' },
                  { text: 'RECIBÍ CONFORME', fontSize: 8, bold: true, color: '#718096', alignment: 'center', margin: [0, 2, 0, 0] },
                  { text: `C.I: ${this.usuario_selected?.n_document || 'N/A'}`, fontSize: 8, color: '#a0aec0', alignment: 'center' }
                ]
              }
            ]
          }
        ],
        styles: {
          tableHeader: { fontSize: 9, bold: true, color: '#ffffff', alignment: 'left', margin: [0, 2, 0, 2] }
        },
        defaultStyle: { fontSize: 10, alignment: 'justify', lineHeight: 1.3 }
      };

      try {
        (pdfMake as any).createPdf(docDefinition).getBase64((base64: string) => {
          try { Swal.close(); } catch {}

          this.documentoViewer.abrirVer({
            pdfBase64: base64,
            nombreArchivo: `${this.numero_acta || 'MEMORANDUM'}.pdf`,
            zoomInicial: 0.6 // La hoja completa entra en pantalla sin tener que alejar
          });
        });
      } catch (err) {
        try { Swal.close(); } catch {}
        console.error('Error al generar la vista previa:', err);
        this.toast.error('No se pudo generar la vista previa del memorandum');
      }
    }







/**
 * Graba (o actualiza) el registro del memorandum y devuelve su id.
 *
 * No tiene botón propio: lo dispara "Finalizar y Generar Memorandum", porque
 * el backend firma sobre un registro que ya tiene que existir en la base.
 */
private guardarBorradorInterno(): Promise<number | null> {
  return new Promise((resolve) => {
    // 1. Validaciones previas
    if (!this.usuario_selected) {
        this.toast.error('Debe seleccionar un usuario solicitante');
        resolve(null);
        return;
    }

    // 🟢 NUEVA VALIDACIÓN: Verificar que haya al menos un documento seleccionado
    if (!this.documentos_seleccionados || this.documentos_seleccionados.length === 0) {
        this.toast.error('Debe seleccionar por lo menos un documento para el memorandum de préstamo.');
        resolve(null);
        return;
    }

    // 2. Obtener datos del usuario logueado (Responsable) e ID Empresa
    const userData = localStorage.getItem('user');
    if (!userData) {
        this.toast.error('Sesión caducada, por favor inicie sesión nuevamente');
        resolve(null);
        return;
    }

    const userLocal = JSON.parse(userData);
    const id_empresa = userLocal.id_empresa;

    this.isLoading = true; // Activamos un spinner o deshabilitamos botones si usas esta variable

    // 3. Preparar el Body para el servicio
    const dataActa = {
        id_empresa: id_empresa,
        id_usuario_solicitante: this.usuario_selected.id,
        id_usuario_responsable: userLocal.id,
        documentos_ids: this.documentos_seleccionados
            .map((doc: any) => doc.id || doc.id_documento) 
            .filter(id => id != null),
        fecha_devolucion: this.fecha_devolucion,
        observaciones: this.observaciones,
        numero_acta: this.numero_acta,
        tipo_soporte: (this.TIPO_PRESTAMO || 'FISICO').toLowerCase(),

        id_tramite: this.id_tramite ?? null,
        numero_tramite: this.numero_tramite ? this.numero_tramite.trim() : null,
        modo: 0 // Forzamos modo borrador/temporal para el backend
    };

    console.log('📦 Guardando progreso del Acta (Borrador):', dataActa);

    // 4. Llamada al servicio
    this.prestamoService.guardarBorradorActaPrestamo(dataActa).subscribe({
        next: (resp: any) => {
            this.isLoading = false;
            if (resp.status === 200) {
                if (resp.acta) {
                  this.id_prestamo = resp.acta.id_prestamo || resp.acta.id || this.id_prestamo;
                }

                // 🚀 CLAVE: Notificamos al componente padre (listado) para que actualice la tabla de fondo
                this.PrestamoC.emit(resp.acta);

                // YA NO CERRAMOS EL MODAL. El usuario se queda adentro.
                this.cdr.detectChanges();
                resolve(this.id_prestamo);
            } else {
                this.toast.error(resp.message || 'Error al guardar el borrador');
                resolve(null);
            }
        },
        error: (err) => {
            this.isLoading = false;
            console.error('Error al guardar borrador:', err);
            this.toast.error('Error de servidor al procesar el borrador');
            this.cdr.detectChanges();
            resolve(null);
        }
    });
  });
}






/**
 * Botón "Finalizar y Generar Memorandum".
 *
 * Si el memorandum todavía no se grabó, se graba primero: el backend firma
 * sobre un registro existente, así que sin id_prestamo no hay nada que firmar.
 */
CrearActa() {
    if (!this.id_prestamo) {
        this.guardarBorradorInterno().then((id_prestamo) => {
            if (id_prestamo) {
                this.firmarMemorandum();
            }
        });
        return;
    }

    this.firmarMemorandum();
}

private firmarMemorandum() {
    const userData = localStorage.getItem('user');
    if (!userData) {
        this.toast.error('Sesión caducada, inicie sesión nuevamente');
        return;
    }
    const userLocal = JSON.parse(userData);

    // 1. Armamos el objeto con los datos requeridos
    const payload = {
        id_empresa: this.id_empresa,
        id_prestamo: this.id_prestamo,
        id_usuario: userLocal.id,
        // El cuerpo se escribe en el editor y no se guarda en la tabla:
        // viaja aquí para que el PDF firmado salga con el mismo texto
        cuerpo_documento: this.contenidoCuerpo || ''
    };

    if (!payload.id_prestamo) {
        this.toast.error('No se detectó un ID de préstamo válido');
        return;
    }

    // 2. Alerta de confirmación con SweetAlert2 antes de firmar
    Swal.fire({
        title: '¿Está seguro de firmar y crear el memorandum?',
        text: 'Una vez firmado electrónicamente, este proceso es irreversible y no se podrá dar marcha atrás.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#1a365d', // Color azul corporativo de tu PDF
        cancelButtonColor: '#718096',
        confirmButtonText: 'Sí, firmar y generar',
        cancelButtonText: 'Cancelar',
        heightAuto: false // Evita conflictos visuales si estás dentro de un modal
    }).then((result) => {
        
        // Si el usuario da clic en "Sí, firmar y generar"
        if (result.isConfirmed) {
            this.isLoading = true;
            console.log('🚀 Enviando payload al servicio:', payload);

            // 3. Consumimos el servicio pasándole el objeto limpio
            this.prestamoService.guardarActaPrestamo(payload).subscribe({
                next: (resp: any) => {
                    this.isLoading = false;
                    
                    if (resp.status === 200) {
                        // 4. Mensaje de ÉXITO rotundo con SweetAlert2
                        Swal.fire({
                            title: '¡Memorandum Firmado!',
                            text: resp.message || 'El memorandum ha sido generado y firmado digitalmente de forma correcta.',
                            icon: 'success',
                            confirmButtonColor: '#1a365d',
                            heightAuto: false
                        }).then(() => {
                            // Cerramos el flujo del modal y emitimos eventos RECIÉN cuando cierren el Swal de éxito
                            this.PrestamoC.emit(resp.data || true);
                            this.activeModal.close(resp.data || true);
                        });

                    } else {
                        // Errores de validación controlados devueltos por el backend (ej: firma caducada)
                        Swal.fire({
                            title: 'No se pudo firmar',
                            text: resp.message || 'Error al procesar el memorandum',
                            icon: 'error',
                            confirmButtonColor: '#e53e3e',
                            heightAuto: false
                        });
                    }
                },
                error: (err) => {
                    this.isLoading = false;
                    console.error('Error en guardarActaPrestamo:', err);
                    
                    // Capturar mensajes de error detallados del backend si vienen en el body del HTTP Error
                    const errorMsg = err.error?.message || 'Error de comunicación con el servidor';
                    
                    Swal.fire({
                        title: 'Error de Servidor',
                        text: errorMsg,
                        icon: 'error',
                        confirmButtonColor: '#e53e3e',
                        heightAuto: false
                    });
                }
            });
        }
    });
}


}
