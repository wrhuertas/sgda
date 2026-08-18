import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PrestamoService } from '../service/prestamo.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { VerPrestamoComponent } from '../ver-prestamo/ver-prestamo.component';

@Component({
  selector: 'app-editar-prestamo',
  templateUrl: './editar-prestamo.component.html',
  styleUrls: ['./editar-prestamo.component.scss']
})
export class EditarPrestamoComponent implements OnInit {

  @Input() PRESTAMO_SELECTED: any; 
  @Output() PrestamoE: EventEmitter<any> = new EventEmitter();

  observacion: string = '';
  isLoading: boolean = false;
  search_user: string = ''; 
  public prestamos: any[] = [];

  user: any; 
  id_empresa: any;
  usuarios_list: any[] = [];
  usuario_selected: any = null;

  // Variables para Trámite
  numero_tramite: string = '';
  id_tramite: number | null = null;

  // 🚀 VARIABLES ADAPTADAS DESDE EL COMPONENTE DE CREAR
  texto: string = '';                   // Enlazado al input [(ngModel)]="texto"
  search_doc: string = '';              // Filtro en memoria local
  documentos_visualizar: any[] = [];    // Tabla de resultados de la búsqueda
  resultados: any[] = [];               // Respaldo de los datos originales devueltos por el backend
  documentos_seleccionados: any[] = []; // Carrito / Lista de documentos del préstamo
  documento_selected: any = null;       // Documento de selección activa temporal

  // 🛠️ FIX PARA EL HTML: Getter dinámico para que no falle el *ngFor="let doc of documentos_list"
  get documentos_list(): any[] {
    return this.documentos_visualizar;
  }
  set documentos_list(val: any[]) {
    this.documentos_visualizar = val;
  }

  // Variables de Control para la Paginación de Documentos
  paginaActual: number = 1;
  total: number = 0;
  porPagina: number = 10;
  busquedaRealizada: boolean = false;
  criterioBusqueda: string = '';
  viewActual: string = 'lista';         
  niveles: any[] = [];             
  
  
  
// 🚀 Variable para capturar el acta guardada en tiempo real
  id_prestamo: number | null = null;


  // 1. Declara las propiedades al inicio de tu clase
fecha_fin_prestamo_form: string = '';
fecha_minima_permitida: string = '';

  constructor(
    public activeModal: NgbActiveModal,
    private prestamoService: PrestamoService,
    private cdr: ChangeDetectorRef,
    private toast: ToastrService,
    public modalService: NgbModal,
  ) { }

ngOnInit(): void {
  const userData = localStorage.getItem('user');
  if (userData) {
      this.user = JSON.parse(userData);
      this.id_empresa = this.user.id_empresa;
  }

  console.log("=== 🔍 REVISIÓN DE DATOS ENTRANTES ===");
  console.log("1. ¿Qué viene en PRESTAMO_SELECTED?:", this.PRESTAMO_SELECTED);

  if (this.PRESTAMO_SELECTED) {
    this.prestamos = [JSON.parse(JSON.stringify(this.PRESTAMO_SELECTED))];
    
    this.observacion = this.prestamos[0].observacion || '';
    if (this.prestamos[0].solicitante) {
      this.usuario_selected = this.prestamos[0].solicitante;
    }

    // 🟢 CORRECCIÓN AQUÍ: Capturamos directamente id_prestamo (ej: 9)
    this.id_prestamo = this.prestamos[0].id_prestamo ?? null; 
    this.numero_tramite = this.prestamos[0].numero_tramite || '';

    console.log("ID de Préstamo extraído con éxito:", this.id_prestamo);

    // Recuperamos y cargamos los documentos que el préstamo ya tiene asignados desde la DB
    if (this.prestamos[0].documentos_detalles && Array.isArray(this.prestamos[0].documentos_detalles)) {
      this.documentos_seleccionados = [...this.prestamos[0].documentos_detalles];
    }

  } else {
    console.error("⚠️ ¡ALERTA! PRESTAMO_SELECTED llegó undefined o null desde el componente padre.");
  }
  
  this.cdr.detectChanges();
  console.log("=======================================");

  this.inicializarFechasControles();
}

  // Lógica idéntica a la que usas en Crear para seleccionar/interactuar
  seleccionarDocumentoParaPrestamo(doc: any) {
    console.log('Documento seleccionado para el acta:', doc);
    this.documento_selected = doc;
    this.cdr.detectChanges();
  }

  // Filtro local en memoria
  buscarDocumento() {
    if (!this.search_doc || this.search_doc.trim() === '') {
        if (this.niveles && this.niveles.length > 0) {
          const ultimaSeleccion = this.niveles[this.niveles.length - 1].seleccionado;
          this.documentos_visualizar = ultimaSeleccion ? ultimaSeleccion.documentos : [];
        } else {
          this.documentos_visualizar = [...this.resultados];
        }
        return;
    }
    
    this.documentos_visualizar = this.documentos_visualizar.filter(doc => 
        (doc.nombre_archivo && doc.nombre_archivo.toLowerCase().includes(this.search_doc.toLowerCase())) ||
        (doc.nro_caja && doc.nro_caja.toString().includes(this.search_doc))
    );
  }

  private limpiarEstadoBusqueda() {
    this.resultados = [];
    this.total = 0;
    this.busquedaRealizada = false;
    this.criterioBusqueda = ''; 
  }

  // Función de búsqueda paginada e indexación de metadatos adaptada a Editar
  buscar(page: any = 1) {
    if (page === '...') return;
  
    const pageNumber = parseInt(page, 10) || 1;
    this.paginaActual = pageNumber; 
    if (pageNumber === 1) {
      this.limpiarEstadoBusqueda();
      this.criterioBusqueda = this.texto; 
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
  
    this.prestamoService.buscarDocumentos(data, pageNumber).subscribe({
      next: (resp: any) => {
        this.resultados = resp.data || [];
        this.documentos_visualizar = resp.data || []; 
        
        this.total = resp.total || 0;           
        this.paginaActual = resp.current_page || 1; 
        this.porPagina = resp.per_page || 10;
        this.busquedaRealizada = true;

        if (pageNumber === 1) {
          this.viewActual = 'tabla';
        }

        // PROCESA LOS METADATOS EN TIEMPO REAL
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
        console.error("Error al buscar documentos paginados:", err);
        Swal.close();
        this.toast.error('Error al cargar documentos');
      }
    });
  }

  // Alias compatible para el HTML que llama a (click)="buscarDocumentos()"
  buscarDocumentos() {
    this.buscar(1);
  }

  // Controla los inputs tipo checkbox de forma dinámica
  toggleSeleccion(doc: any) {
    this.seleccionarDocumentoParaPrestamo(doc);

    const idDocTarget = doc.id_documento || doc.id;
    const index = this.documentos_seleccionados.findIndex(
      d => (d.id_documento || d.id) === idDocTarget
    );

    if (index > -1) {
      this.documentos_seleccionados.splice(index, 1);
    } else {
      this.documentos_seleccionados.push({
        id_documento: idDocTarget,
        nombre_archivo: doc.nombre_archivo || doc.text || 'Archivo sin nombre',
        serie: doc.serie || null,
        nombre_serie: doc.nombre_serie || null,
        caja: doc.caja || doc.nro_caja || null,
        carpeta: doc.carpeta || null,
        descripcion: doc.descripcion || null,
        fojas: doc.fojas || 0
      });
    }
    this.cdr.detectChanges();
  }

  // Verifica si un documento está agregado en el préstamo actual
  estaSeleccionado(doc: any): boolean {
    const idDocTarget = doc.id_documento || doc.id;
    return this.documentos_seleccionados.some(
      d => (d.id_documento || d.id) === idDocTarget
    );
  }

  buscarUsuario() {
    if (!this.id_empresa) {
        this.toast.error('No hay un ID de empresa asignado.');
        return;
    }
    if (!this.search_user || this.search_user.trim() === '') {
        this.toast.info('Por favor, ingrese un nombre o cédula.');
        return;
    }

    this.prestamoService.buscarusuario(this.id_empresa, this.search_user).subscribe({
        next: (resp: any) => {
            if (resp && resp.usuarios && resp.usuarios.length > 0) {
                this.usuarios_list = resp.usuarios; 
                this.toast.success(`${resp.usuarios.length} coincidencias encontradas`);
            } else {
                this.usuarios_list = [];
                this.toast.error('No se encontró ningún usuario');
            }
            this.cdr.detectChanges();
        }
    });
  }

  buscarTramite() {
    if (!this.id_empresa || !this.numero_tramite?.trim()) {
      this.toast.info('Ingrese un número de trámite para buscar');
      return;
    }
    this.prestamoService.buscarTramitePorNumero(this.id_empresa, this.numero_tramite.trim()).subscribe({
      next: (resp: any) => {
        console.log('🔎 Resultado búsqueda trámite:', resp);
        if (resp?.status === 200 && Array.isArray(resp.tramites)) {
          const n = resp.tramites.length;
          if (n === 1) {
            this.id_tramite = resp.tramites[0].id_tramite ?? null;
            this.toast.success('Trámite encontrado y asignado');
          } else if (n > 1) {
            this.id_tramite = null;
            this.toast.info(`Se encontraron ${n} coincidencias. Refine el número para asignar automáticamente.`);
          } else {
            this.id_tramite = null;
            this.toast.info('No se encontraron trámites con ese número');
          }
        } else {
          this.id_tramite = null;
          this.toast.info('No se encontraron trámites con ese número');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al buscar trámite', err);
        this.toast.error('Error al buscar trámite');
      }
    });
  }

  seleccionarUsuario(user: any) {
    this.usuario_selected = user; 
    this.PRESTAMO_SELECTED.solicitante = user;
    this.PRESTAMO_SELECTED.solicitante_name = `${user.name} ${user.surname}`;

    this.usuarios_list = [];      
    this.search_user = '';        
    this.cdr.detectChanges();
  }



// 🚀 Lógica para abrir o visualizar el documento seleccionado de la tabla
verDocumentoActual() {
  console.log("Abriendo modal VerPrestamoComponent con id_prestamo:", this.id_prestamo);

  const modalRef = this.modalService.open(VerPrestamoComponent, {
    centered: true,
    size: 'xl',
    backdrop: 'static'
  });

  // 🟢 Enviamos id_prestamo al atributo id_prestamo del visor
  modalRef.componentInstance.id_prestamo = this.id_prestamo;
  modalRef.componentInstance.id_empresa = this.id_empresa;  
  
  // Pasamos los datos del formulario por si el PDF los necesita de respaldo
  modalRef.componentInstance.data = {
    observacion: this.observacion,
    usuario_selected: this.usuario_selected,
    documentos: this.documentos_seleccionados
  };
}


inicializarFechasControles() {
  if (this.PRESTAMO_SELECTED) {
    
    // 📅 Extraer la fecha de solicitud (creación) para bloquear días anteriores
    if (this.PRESTAMO_SELECTED.fecha_solicitud) {
      const fechaSolicitud = new Date(this.PRESTAMO_SELECTED.fecha_solicitud);
      // Validamos que sea una fecha correcta y la formateamos a YYYY-MM-DD
      if (!isNaN(fechaSolicitud.getTime())) {
        this.fecha_minima_permitida = fechaSolicitud.toISOString().split('T')[0];
      }
    }

    // 📅 Formatear la fecha de fin actual del préstamo para que el calendario la muestre seleccionada
    if (this.PRESTAMO_SELECTED.fecha_fin_prestamo) {
      const fechaFin = new Date(this.PRESTAMO_SELECTED.fecha_fin_prestamo);
      if (!isNaN(fechaFin.getTime())) {
        this.fecha_fin_prestamo_form = fechaFin.toISOString().split('T')[0];
      }
    } else {
      // Si venía null en la base de datos, le puedes dejar la fecha mínima por defecto o vacía
      this.fecha_fin_prestamo_form = this.fecha_minima_permitida;
    }
  }
}


  grabarBorrador() {
    if (!this.usuario_selected) {
        this.toast.error('Debe seleccionar un usuario solicitante');
        return;
    }
    if (this.documentos_seleccionados.length === 0) {
        this.toast.error('Debe seleccionar al menos un documento');
        return;
    }

    const userData = localStorage.getItem('user');
    if (!userData) {
        this.toast.error('Sesión caducada, por favor inicie sesión nuevamente');
        return;
    }
    
    const userLocal = JSON.parse(userData);
    this.isLoading = true;

    const documentosIds = this.documentos_seleccionados
        .map((doc: any) => doc.id_documento || doc.id)
        .filter((id: any) => id != null);

    const dataActa = {
        id_empresa: this.id_empresa,
        id_usuario_solicitante: this.usuario_selected.id,
        id_usuario_responsable: userLocal.id,
        documentos_ids: documentosIds, 
        fecha_devolucion: this.prestamos[0]?.fecha_fin_prestamo || null, 
        observaciones: this.observacion, 
        numero_acta: this.prestamos[0]?.numero_acta || null, 
        id_tramite: this.id_tramite ?? null,
        numero_tramite: this.numero_tramite ? this.numero_tramite.trim() : null,
        modo: 0 
    };

    console.log('📦 Guardando progreso del Acta (Borrador):', dataActa);

    this.prestamoService.guardarBorradorActaPrestamo(dataActa).subscribe({
        next: (resp: any) => {
            this.isLoading = false;
            if (resp.status === 200) {
                this.toast.success('Borrador guardado correctamente. Puede continuar editando.');
                this.PrestamoE.emit(resp.acta); 
                this.cdr.detectChanges();
            } else {
                this.toast.error(resp.message || 'Error al guardar el borrador');
            }
        },
        error: (err) => {
            this.isLoading = false;
            console.error('Error al guardar borrador:', err);
            this.toast.error('Error de servidor al procesar el borrador');
            this.cdr.detectChanges();
        }
    });
  }






  CrearActa() {
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
          id_usuario: userLocal.id
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
                              this.PrestamoE.emit(resp.data || true);
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