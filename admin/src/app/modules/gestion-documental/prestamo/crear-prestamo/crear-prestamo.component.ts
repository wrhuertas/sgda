import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { PrestamoService } from '../service/prestamo.service';
import Swal from 'sweetalert2';
import { VerPrestamoComponent } from '../ver-prestamo/ver-prestamo.component';



@Component({
  selector: 'app-crear-prestamo',
  templateUrl: './crear-prestamo.component.html',
})
export class CrearPrestamoComponent implements OnInit {

  @Output() PrestamoC: EventEmitter<any> = new EventEmitter();

  // Datos principales
  numero_acta: string = 'ACT-2026-0001';
  numero_tramite: string = '';
  id_tramite: number | null = null;
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
            // Caso de éxito: Lo encontró perfectamente
            this.id_tramite = resp.tramites[0].id_tramite ?? null;
            this.toast.success('Trámite encontrado y asignado');
            
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

  constructor(
    public activeModal: NgbActiveModal,
    private toast: ToastrService,
    public prestamoService: PrestamoService,
     private cdr: ChangeDetectorRef,
     public modalService: NgbModal,
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
    } else {
        console.warn("⚠️ No se encontraron datos de usuario en localStorage.");
    }
      this.cargarProyectos();




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


  numeroacta(id_empresa: number) {
  if (!id_empresa) return;

  this.prestamoService.numeroActa(id_empresa).subscribe({
    next: (resp: any) => {
      console.log('📄 Respuesta numeroActa recibida del backend:', resp);
      
      if (resp && resp.formateado) {
        const y = new Date().getFullYear();
        
        // 🚀 El backend ya calculó el +1, aquí solo armamos el formato visual final
        this.numero_acta = `ACT-${y}-${resp.formateado}`;
        
        console.log('✅ Número de acta asignado directamente:', this.numero_acta);
      } else {
        this.toast.error('El servidor no devolvió el formato de acta esperado');
      }
      
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error cargando el correlativo de acta:', err);
      this.toast.error('No se pudo cargar el número de acta correlativo');
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

  // Si el valor es solo numérico, agrega prefijo ACT-YYYY-
  private formatearConPrefijoSiNecesario(valor: string): string {
    if (!valor) return valor;
    const soloDigitos = /^\d+$/;
    const y = new Date().getFullYear();
    if (soloDigitos.test(valor)) {
      const seq = valor.toString().padStart(6, '0');
      return `ACT-${y}-${seq}`;
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
    this.cdr.detectChanges();
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









    // 🚀 Lógica para abrir o visualizar el documento seleccionado de la tabla
    verDocumentoActual() {
      // 🛑 VALIDACIÓN CLAVE: Si no hay id_prestamo, le exigimos guardar primero
      if (!this.id_prestamo) {
        Swal.fire({
          icon: 'warning',
          title: 'Préstamo no guardado',
          text: 'Todavía no está creado el préstamo. Debe grabar el borrador primero para poder visualizar el documento.',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Entendido'
        });
        return; // Detiene la función para que no abra el modal vacío
      }

      // 🟢 Si pasa la validación (ya existe id_prestamo), abre el modal normalmente
      console.log("Abriendo visor con id_prestamo actual:", this.id_prestamo);

      const modalRef = this.modalService.open(VerPrestamoComponent, {
        centered: true,
        size: 'xl',
        backdrop: 'static'
      });

      // Pasamos las credenciales correctas al componente destino
      modalRef.componentInstance.id_prestamo = this.id_prestamo;
      modalRef.componentInstance.id_empresa = this.id_empresa;  
      
      // Pasamos la data complementaria
      modalRef.componentInstance.data = {
        observacion: this.observaciones,
        usuario_selected: this.usuario_selected,
        documentos: this.documentos_seleccionados
      };
    }







grabarBorrador() {
    // 1. Validaciones previas
    if (!this.usuario_selected) {
        this.toast.error('Debe seleccionar un usuario solicitante');
        return;
    }

    // 🟢 NUEVA VALIDACIÓN: Verificar que haya al menos un documento seleccionado
    if (!this.documentos_seleccionados || this.documentos_seleccionados.length === 0) {
        this.toast.error('Debe seleccionar por lo menos un documento para el acta de préstamo.');
        return;
    }

    // 2. Obtener datos del usuario logueado (Responsable) e ID Empresa
    const userData = localStorage.getItem('user');
    if (!userData) {
        this.toast.error('Sesión caducada, por favor inicie sesión nuevamente');
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
                this.toast.success('Borrador guardado correctamente. Puede continuar editando.');
                if (resp.acta) {
                  this.id_prestamo = resp.acta.id_prestamo || resp.acta.id || this.id_prestamo;
                }
                
                // 🚀 CLAVE: Notificamos al componente padre (listado) para que actualice la tabla de fondo 
                this.PrestamoC.emit(resp.acta); 
                
                // YA NO CERRAMOS EL MODAL. El usuario se queda adentro.
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
        title: '¿Está seguro de firmar y crear el acta?',
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
                            title: '¡Acta Firmada!',
                            text: resp.message || 'El acta ha sido generada y firmada digitalmente de forma correcta.',
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
                            text: resp.message || 'Error al procesar el acta',
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
