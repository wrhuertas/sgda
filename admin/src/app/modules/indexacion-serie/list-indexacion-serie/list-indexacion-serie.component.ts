import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { CreateIndexacionComponent } from '../../indexacion/create-indexacion/create-indexacion.component';
import { IndexacionSerieService } from '../service/indexacion-serie.service';
import { CreateIndexacionSerieComponent } from '../create-indexacion-serie/create-indexacion-serie.component';
import Swal from 'sweetalert2';
import { CrearLugarDocumentoComponent } from '../crear-lugar-documento/crear-lugar-documento.component';
import { EditarLugarDocumentoComponent } from '../editar-lugar-documento/editar-lugar-documento.component';
import { EtiquetaDocumentoComponent } from '../etiqueta-documento/etiqueta-documento.component';

@Component({
  selector: 'app-list-indexacion-serie',
  templateUrl: './list-indexacion-serie.component.html',
  styleUrls: ['./list-indexacion-serie.component.scss']
})
export class ListIndexacionSerieComponent {

  idProyecto: number | null = null;
  idSerie: number | null = null;
   nombreProyecto!: string;
    idModulo: number | null = null;
    isLoading: boolean = true;
    indexaciones: any[] = [];
  error: string | null = null;

 idPadreFinal: number | null = null;
idSubseccionFinal: number | null = null;
  
  serieRespuesta: any = null;
  camposExtraCompletos: any[] = [];
listaValores: string[] = [];
  public todosLosTitulos: string = '';
  
  
  
   valorBusqueda: string = '';            // para el filtro de búsqueda
  documentosPaginados: any = { data: [] };
        // resultados paginados
    currentPage: number = 1;
    totalPages: number = 0;
     // Aquí guardamos los campos_extra del primer registro
    camposExtra: any = null;
    listaTitulos: string[] = []; // Aquí almacenas los títulos extraídos
  
  // Para enlazar los inputs:
  valoresInputs: string[] = [];

idSubserieActual: number | null = null;
idSerieActual: number | null = null;

  permisosDocumentales: any[] = [];
  permisosPorSubSerie: { [id_subserie: number]: any } = {};

  puedeCrearSubSerie: boolean = false;
  puedeEditarSubSerie: boolean = false;
  puedeEliminarSubSerie: boolean = false;

// Permisos globales de Serie
puedeCrearSerie = false;
puedeEditarSerie = false;
puedeEliminarSerie = false;
puedeVerSerie = false;
puedeBuscarSerie = false;
puedeSubirDocumentosSerie = false;
puedeVerDocumentoSerie = false;
puedeRegistrarDatosSerie = false;
puedeIndexarSerie = false;
puedeIndexarMasivoSerie = false;
puedeEliminarDocumentoSerie = false;
puedeFirmarDocumentoSerie = false;
puedeLimpiarDocumentoSerie = false;

// Permisos globales de Subserie
puedeVerSubSerie = false;
puedeBuscarSubSerie = false;
puedeSubirDocumentosSubSerie = false;
puedeVerDocumentoSubSerie = false;
puedeRegistrarDatosSubSerie = false;
puedeIndexarSubSerie = false;
puedeIndexarMasivoSubSerie = false;
puedeEliminarDocumentoSubSerie = false;
puedeFirmarDocumentoSubSerie = false;
puedeLimpiarDocumentoSubSerie = false;
mostrarBotonSubirDocumentos = false;
  id_empresa!: number;

  // Contadores UI
  totalDocumentos: number = 0;
  totalOCR: number = 0;
  totalParametros: number = 0;

  // Listado de lugares por serie
  lugaresRuta: any[] = [];
  selectedLugar: any | null = null;
  searchLugar: string = '';
  currentPageLugares: number = 1;
  isLoadingLugares: boolean = false;

  // Coordinación entre el aviso inicial y la carga de la tabla de rutas
  private avisoAceptado: boolean = false;
  private rutasCargadas: boolean = false;

  

  private updateCountersFromIndexaciones(): void {
    const data = Array.isArray(this.indexaciones) ? this.indexaciones : [];
    this.totalDocumentos = data.length;
    this.totalOCR = data.filter((d: any) => {
      try {
        if (d?.ocr_status) return d.ocr_status === 'INDEXADO';
        if (d?.datos_ocr) return String(d.datos_ocr).trim() !== '';
        return false;
      } catch { return false; }
    }).length;
  }




  
     constructor(private route: ActivatedRoute, private router: Router,
       public modalService: NgbModal,
          public indexacionService: IndexacionSerieService,
          private toast: ToastrService,
          private cdr: ChangeDetectorRef,
     ) {}
  
     goBack(): void {
      window.history.back();
    }

  ngOnInit(): void {

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    console.log('ID USUARIO:', user.id);

      // ID de la empresa
  if (user && user.id_empresa != null) {
    this.id_empresa = user.id_empresa;
    console.log('ID Empresa del usuario logeado:', this.id_empresa);
  } else {
    console.error('No se pudo obtener el id_empresa del usuario.');
  }
  

     // 🔹 Mostramos el mensaje de aviso al cargar el componente
 Swal.fire({
  title: 'Aviso',
  text: 'Recuerde que solo puede tener algunos accesos. Si no los ve, por favor solicitar a administración.',
  icon: 'info',
  confirmButtonText: 'Aceptar',
  confirmButtonColor: '#009ef7', // <-- Este es el azul de Keenthemes / Metronic
  allowOutsideClick: false
}).then(() => {
  this.avisoAceptado = true;
  // Si la tabla de rutas aún no ha cargado, mostramos el "Cargando datos..."
  if (!this.rutasCargadas) {
    Swal.fire({
      title: 'Cargando datos',
      text: 'Espere por favor, obteniendo las ubicaciones...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
  }
});

    
  this.route.queryParams.subscribe(params => {
    const idProyectoParam = params['idProyecto'];
    const idModuloParam   = params['id_modulo'];
    const idSerieParam    = params['idSerie']; 

    this.idProyecto = idProyectoParam !== undefined ? +idProyectoParam : null;
    this.idModulo   = idModuloParam   !== undefined ? +idModuloParam   : null;
    this.idSerie    = idSerieParam    !== undefined ? +idSerieParam    : null;

    if (this.idSerie !== null) {
      this.indexacionService.getSerieById(this.idSerie).subscribe(
        (resp: any) => {
          if (resp.success) {
            const data = resp.data;
            
            this.idPadreFinal = null;
            this.idSubseccionFinal = null; 

            if (data?.padre_id) {
                this.idPadreFinal = +data.padre_id;
            } else if (data?.id_subseccion) {
                this.idSubseccionFinal = +data.id_subseccion;
            }

            this.serieRespuesta = resp;
            this.nombreProyecto = resp.data.nombre;
            this.indexaciones   = resp.indexaciones || [];
            // Inicializar contadores desde la serie/subserie
            this.updateCountersFromIndexaciones();

            // Si el backend ya trae listado de documentos de la serie, úsalo para la UI y contadores
            if (resp.documentos) {
              this.documentosPaginados = resp.documentos;
              const docsList: any[] = Array.isArray(resp.documentos)
                ? resp.documentos
                : (resp.documentos.data || resp.documentos.documentos || []);
              // Priorizar total informado por el backend si existe
              this.totalDocumentos = (resp.documentos.total !== undefined)
                ? Number(resp.documentos.total)
                : docsList.length;
              this.totalOCR = docsList.filter((d: any) => {
                try {
                  if (d?.ocr_status) return d.ocr_status === 'INDEXADO';
                  if (d?.datos_ocr) return String(d.datos_ocr).trim() !== '';
                  return false;
                } catch { return false; }
              }).length;
            }
            else {
              // Si no vino en esta respuesta, cargar desde el endpoint dedicado
              this.cargarDocumentosSerie(1);
            }
            if (this.idSerie !== null) {
              this.PermisosSubSerie(user.id, this.idSerie);
              this.cargarLugaresRuta();
            }
                        

            this.cdr.detectChanges();

            if (this.idModulo !== null) {
              this.listIndexaciones(this.idModulo);
            }

            this.obtenerCamposExtraSerie();

          }
        },
        error => {
          console.error(error);
        }
      );
    }
  });

this.obtenerDatosGenerales();
  
}

private cargarLugaresRuta(page: number = 1) {
  if (this.idSerie === null) { return; }
  this.isLoadingLugares = true;
  const payload = { 
    id_serie: this.idSerie,
    page: page,
    search: this.searchLugar
  };
  this.indexacionService.listarLugaresPorSerie(payload).subscribe({
    next: (resp: any) => {
      this.lugaresRuta = resp.data || [];
      this.totalPages = resp.total || 0;
      this.currentPageLugares = page;
      this.isLoadingLugares = false;
      this.rutasCargadas = true;
      this.cdr.detectChanges();
      // Si el usuario ya aceptó el aviso, cerramos el "Cargando datos..."
      if (this.avisoAceptado) { try { Swal.close(); } catch {} }
    },
    error: (err) => {
      console.error('Error listando lugares de la ruta:', err);
      this.lugaresRuta = [];
      this.isLoadingLugares = false;
      this.rutasCargadas = true;
      if (this.avisoAceptado) { try { Swal.close(); } catch {} }
    }
  });
}

listLugares(page: number = 1) {
  this.cargarLugaresRuta(page);
}


obtenerDatosGenerales() {
  if (this.idSerie === null) {
    console.error('No se pudo determinar el ID de la serie para continuar.');
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const idUsuario = user.id || null;
  const idEmpresa = user.id_empresa || this.id_empresa || null; 

  this.isLoading = true;
  this.error = null;

  const payload = { 
    idSerie: this.idSerie,
    id_usuario: idUsuario,
    id_empresa: idEmpresa
  };

  this.indexacionService.obtenerDatosGenerales(payload).subscribe({
    next: (resp: any) => {
      console.log('RESPUESTA DATOS GENERALES:', resp);
      this.serieRespuesta = resp.data || resp;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error en obtenerDatosGenerales:', err);
    },
    complete: () => {
      this.isLoading = false;
    }
  });
}




  
    listIndexaciones(idModulo: number) {
      this.isLoading = true;
      this.indexacionService.listIndexaciones(idModulo).subscribe({
        next: (resp: any) => {
          this.indexaciones = resp.indexaciones || [];
          // Actualizar contadores con el listado base si existe
          this.updateCountersFromIndexaciones();
          // Si hay indexaciones, tomar los campos_extra del primero
          if (this.indexaciones.length > 0) {
            this.camposExtra = this.indexaciones[0].campos_extra;
          } else {
            this.camposExtra = null;
          }
        },
        error: (err) => {
          console.error('Error al cargar indexaciones', err);
          this.indexaciones = [];
          this.camposExtra = null;
        },
        complete: () => this.isLoading = false,
      });
    }

  private cargarDocumentosSerie(page: number = 1): void {
    if (this.idSerie === null) return;
    const payload: any = { idSerie: this.idSerie, page };
    this.indexacionService.listarDocumentosPorSerie(payload).subscribe({
      next: (resp: any) => {
        const docs: any[] = resp?.documentos || [];
        this.totalDocumentos = Number(resp?.total ?? docs.length);
        this.documentosPaginados = {
          data: docs,
          current_page: Number(resp?.current_page ?? page),
          last_page: Number(resp?.last_page ?? 1),
          per_page: Number(resp?.per_page ?? (docs.length || 0)),
        };
        this.totalOCR = docs.filter((d: any) => {
          try {
            if (d?.ocr_status) return d.ocr_status === 'INDEXADO';
            if (d?.datos_ocr) return String(d.datos_ocr).trim() !== '';
            return false;
          } catch { return false; }
        }).length;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al listar documentos por serie', err);
      }
    });
  }
    // list-indexacion.component.ts
  crearIndexacion(idLugar?: number | null, idEdificio?: number | null, idSala?: number | null) {
    // Si no llegaron parámetros, usa el seleccionado (si existe)
    if ((idEdificio == null || idSala == null) && this.selectedLugar) {
      idEdificio = idEdificio ?? this.selectedLugar.id_edificio ?? null;
      idSala = idSala ?? this.selectedLugar.id_sala ?? null;
    }
    const modalRef = this.modalService.open(CreateIndexacionSerieComponent, {
      size: 'xl', // mantenemos xl pero controlamos por clase personalizada
      scrollable: true,
      windowClass: 'modal-indexacion-compact'
    });

    // 1. Enviar datos generales al modal
    modalRef.componentInstance.idProyecto = this.idProyecto;
    modalRef.componentInstance.nombreProyecto = this.nombreProyecto;
    modalRef.componentInstance.idSerie = this.idSerie; 
    console.log('📤 Enviando al modal → idSerie:', this.idSerie);
    modalRef.componentInstance.serieBackend = this.serieRespuesta;
    // Enviar id_lugar_ruta si viene
    (modalRef.componentInstance as any).idLugarRuta = idLugar ?? null;
    // Ubicación física opcional
    if (idEdificio != null) {
      (modalRef.componentInstance as any).idEdificio = idEdificio;
    }
    if (idSala != null) {
      (modalRef.componentInstance as any).idSala = idSala;
    }
    
    // 2. ✅ ASIGNACIÓN CLAVE: Enviar TÍTULOS y VALORES por separado
    if (this.listaTitulos && this.listaTitulos.length > 0) {
        // Enviar TÍTULOS
        modalRef.componentInstance.camposExtraTitulos = this.listaTitulos;
        // Enviar VALORES (deben tener la misma longitud que los títulos)
        modalRef.componentInstance.camposExtraValores = this.listaValores; 

        console.log('📤 Enviando al modal → Títulos:', this.listaTitulos);
        console.log('📤 Enviando al modal → Valores:', this.listaValores);
    } else {
        modalRef.componentInstance.camposExtraTitulos = []; 
        modalRef.componentInstance.camposExtraValores = [];
        console.warn('⚠️ No hay campos extra definidos para enviar al modal.');
    }

    // 3. Si hay al menos una indexación, le mandamos su id
    if (this.indexaciones && this.indexaciones.length > 0) {
      modalRef.componentInstance.idIndexacion = this.indexaciones[0].id_indexacion;
      console.log('Enviando idIndexacion al modal:', this.indexaciones[0].id_indexacion);
    } else {
      modalRef.componentInstance.idIndexacion = null;
      console.warn('No hay indexaciones todavía, creando una nueva');
    }

    

    // Refrescar después de cerrar/guardar
    modalRef.componentInstance.IndexacionC.subscribe(() => this.obtenerCamposExtraSerie());
    modalRef.closed.subscribe(() => this.obtenerCamposExtraSerie());
}


editarIndexacion(idEdificio?: number | null, idSala?: number | null) 
{}


  crearLugarDocumento() {
    const modalRef = this.modalService.open(CrearLugarDocumentoComponent, {
      centered: true,
      size: 'xl' // ➔ Tamaño grande estándar, sin pantalla completa
    });

  // ➔ ENVIAR DATOS AL MODAL:
  // Pasamos el idSerie que ya tienes guardado en el componente principal
  modalRef.componentInstance.idSerie = this.idSerie;
  
  // Opcional: También podrías pasarle la empresa si el modal la necesita
  modalRef.componentInstance.idEmpresa = this.id_empresa;

  // Al cerrar el modal, refrescar el listado de lugares
  modalRef.closed.subscribe(() => this.cargarLugaresRuta());
  }

  // Eliminar un lugar de la serie (edificio/sala)
  eliminarLugar(lugar: any) {
    // Ahora la entidad 'lugar' contiene id_lugar (clave primaria). Usaremos eso.
    if (this.idSerie == null) { return; }

    const edificioNombre = lugar?.edificio ?? 'Edificio';
    const salaNombre = lugar?.sala ?? '-';

    Swal.fire({
      title: '¿Eliminar ubicación?',
      html: `Se eliminará la ubicación <strong>${edificioNombre}</strong> / <strong>${salaNombre}</strong> de esta serie.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then(result => {
      if (!result.isConfirmed) return;

      // Enviar id_lugar al backend (la nueva estructura usa id_lugar como identificador)
      const payload = {
        id_lugar: lugar.id_lugar,
        // mantener id_serie por compatibilidad si el backend lo necesita
        id_serie: this.idSerie as number
      };

      this.indexacionService.eliminarLugarDeSerie(payload).subscribe({
        next: (resp: any) => {
          // Éxito
          this.toast.success('Ubicación eliminada correctamente');
          // Refrescar listado
          this.cargarLugaresRuta();
          // Limpiar selección si coincide
          if (this.selectedLugar && this.selectedLugar.id_lugar === lugar.id_lugar) {
            this.selectedLugar = null;
          }
        },
        error: (err) => {
          console.error('Error eliminando ubicación:', err);
          const backendMsg = err?.error?.message || err?.message;
          const msg = backendMsg || 'No se pudo eliminar la ubicación';
          this.toast.error(msg);
        }
      });
  });
}

  // Método para abrir el modal de editar lugar documento
  verRuta(idLugar: any): void {
    console.log('LOG [Padre]: Ver ruta con ID:', idLugar);

    if (idLugar === undefined) {
      console.error('ERROR: Estás enviando un ID nulo. Revisa el HTML.');
      return;
    }

    const modalRef = this.modalService.open(EditarLugarDocumentoComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.componentInstance.idLugarRuta = idLugar;
  }

  editarLugar(idLugar: any): void {
   console.log('LOG [Padre]: El ID que estoy recibiendo en el método es:', idLugar);

   if (idLugar === undefined) {
     console.error('ERROR: Estás enviando un ID nulo. Revisa el HTML.');
   }

   const modalRef = this.modalService.open(EditarLugarDocumentoComponent, {
     centered: true,
     size: 'lg',
     backdrop: 'static'
   });

   modalRef.componentInstance.idLugarRuta = idLugar;
  }


  
  abrirModalAgregar() {
    console.log('Abrir modal para agregar indexación');
    // Aquí luego puedes abrir un modal o navegar a otro componente
  }

  // Abrir modal para generar la etiqueta (código de barras / QR) del lugar
  abrirEtiqueta(lugar: any) {
    const modalRef = this.modalService.open(EtiquetaDocumentoComponent, {
      centered: true,
      size: 'md'
    });
    modalRef.componentInstance.lugar = lugar;
    modalRef.componentInstance.idSerie = this.idSerie;

    // La misma ruta que se ve en la miga de pan de arriba, para que en el
    // modal se sepa de qué serie viene la observación
    modalRef.componentInstance.rutaDocumental = [
      this.serieRespuesta?.seccion_superior,
      this.serieRespuesta?.subseccion?.nombre,
      this.serieRespuesta?.padre?.nombre,
      this.serieRespuesta?.serie?.nombre
    ].filter((t: any) => !!t).join(' / ');
  }
  
  
  
  
  obtenerCamposExtraSerie() {
  if (this.idSerie === null) {
    console.error('No se pudo determinar el ID de la serie para continuar.');
    return;
  }

  this.isLoading = true;
  this.error = null;

  const payload = { idSerie: this.idSerie }; // ✅ siempre enviamos idSerie

  this.indexacionService.obtenerCamposExtraSerie(payload).subscribe({
    next: (resp: any) => {
      const registros = resp.campos_extra || [];

      // Limpiar listas
      this.listaValores = [];
      this.listaTitulos = [];
      this.valoresInputs = [];

      if (registros.length > 0) {
        this.listaTitulos = registros.map((r: any) => r.titulo);
        this.valoresInputs = new Array(this.listaTitulos.length).fill('');
        this.listaValores = []; // si quieres precargar valores, puedes llenarla aquí
        // Actualizar contador de parámetros
        this.totalParametros = this.listaTitulos.length;
      } else {
        this.listaTitulos = [];
        this.valoresInputs = [];
        this.listaValores = [];
        this.totalParametros = 0;
      }

      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error(err);
      this.listaTitulos = [];
      this.valoresInputs = [];
      this.listaValores = [];
    },
    complete: () => {
      this.isLoading = false;
    }
  });
}



  
  

  URL_BACKEND: string = environment.URL_BACKEND;
  
  getArchivoUrl(documento: any): string | null {
    if (!documento.archivo_url) return null;
    try {
      const archivos = JSON.parse(documento.archivo_url);
      if (archivos.length > 0) {
        let ruta = archivos[0].replace(/^public\//, ''); // quitar "public/"
        // Codificar caracteres especiales
        ruta = ruta.split('/').map(encodeURIComponent).join('/');
        return `${this.URL_BACKEND}${ruta}`;
      }
      return null;
    } catch {
      return null;
    }
  }
  
  

PermisosSubSerie(idUser: number, idActual: number) {
  console.log('Ejecutando PermisosSubSerie con ID usuario:', idUser, 'y ID actual:', idActual);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  this.indexacionService.permisosUsuario(idUser.toString()).subscribe({
    next: (resp: any) => {
      console.log('Permisos recibidos:', resp);

      this.permisosDocumentales = resp.permissions || [];

      // 🔹 Buscar el permiso que coincida con el ID actual
      const permisoActual = this.permisosDocumentales.find(p => p.id_serie === idActual || p.id_subserie === idActual);

      if (!permisoActual) {
        console.warn('No se encontró permiso para el ID actual:', idActual);
        this.mostrarBotonSubirDocumentos = false;
        return;
      }

      // 🔹 Identificar si es Serie o Subserie
      const tipo = permisoActual.id_serie === idActual ? 'Serie' : 'Subserie';
      console.log(`ID actual: ${idActual} | Tipo: ${tipo} | Permisos:`, permisoActual);

      // 🔹 Aplicar permisos
      this.puedeCrearSubSerie = permisoActual.crear || false;
      this.puedeEditarSubSerie = permisoActual.editar || false;
      this.puedeEliminarSubSerie = permisoActual.eliminar || false;
      this.puedeVerSubSerie = permisoActual.ver || false;
      this.puedeBuscarSubSerie = permisoActual.buscar || false;
      this.puedeSubirDocumentosSubSerie = permisoActual.subir_documentos || false;
      this.puedeVerDocumentoSubSerie = permisoActual.ver_documento || false;
      this.puedeRegistrarDatosSubSerie = permisoActual.registrar_datos || false;
      this.puedeIndexarSubSerie = permisoActual.indexar || false;
      this.puedeIndexarMasivoSubSerie = permisoActual.indexar_masivo || false;
      this.puedeEliminarDocumentoSubSerie = permisoActual.eliminar_documento || false;
      this.puedeFirmarDocumentoSubSerie = permisoActual.firmar_documento || false;
      this.puedeLimpiarDocumentoSubSerie = permisoActual.limpiar_documento || false;

      // 🔹 Mostrar botón según permiso
      this.mostrarBotonSubirDocumentos = this.puedeSubirDocumentosSubSerie;

      console.log('Permisos aplicados para el ID actual:', {
        tipo,
        crear: this.puedeCrearSubSerie,
        editar: this.puedeEditarSubSerie,
        eliminar: this.puedeEliminarSubSerie,
        ver: this.puedeVerSubSerie,
        buscar: this.puedeBuscarSubSerie,
        subir_documentos: this.puedeSubirDocumentosSubSerie,
        ver_documento: this.puedeVerDocumentoSubSerie,
        registrar_datos: this.puedeRegistrarDatosSubSerie,
        indexar: this.puedeIndexarSubSerie,
        indexar_masivo: this.puedeIndexarMasivoSubSerie,
        eliminar_documento: this.puedeEliminarDocumentoSubSerie,
        firmar_documento: this.puedeFirmarDocumentoSubSerie,
        limpiar_documento: this.puedeLimpiarDocumentoSubSerie
      });
    },
    error: (err) => {
      console.error('Error permisos Subserie', err);

      // 🔹 Reset permisos
      this.puedeCrearSubSerie = false;
      this.puedeEditarSubSerie = false;
      this.puedeEliminarSubSerie = false;
      this.puedeVerSubSerie = false;
      this.puedeBuscarSubSerie = false;
      this.puedeSubirDocumentosSubSerie = false;
      this.puedeVerDocumentoSubSerie = false;
      this.puedeRegistrarDatosSubSerie = false;
      this.puedeIndexarSubSerie = false;
      this.puedeIndexarMasivoSubSerie = false;
      this.puedeEliminarDocumentoSubSerie = false;
      this.puedeFirmarDocumentoSubSerie = false;
      this.puedeLimpiarDocumentoSubSerie = false;
      this.mostrarBotonSubirDocumentos = false;
    }
  });
}





  
  
}
