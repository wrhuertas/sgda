import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { CertificadoService } from '../service/certificado.service';
import Swal from 'sweetalert2';
import { VerCertificadoComponent } from '../ver-certificado/ver-certificado.component';

@Component({
  selector: 'app-crear-certificado',
  templateUrl: './crear-certificado.component.html'
})
export class CrearCertificadoComponent implements OnInit {

  @Output() PrestamoC: EventEmitter<any> = new EventEmitter();

  // Datos principales (espejo de préstamo)
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
  
  // Control (observaciones/fecha)
  fecha_devolucion: string = '';
  observaciones: string = '';

  user: any;
  id_empresa: any;

  // Control interno
  id_certificacion: number | null = null;
  paginaActual: number = 1;
  total: number = 0;
  porPagina: number = 45;
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

  documentos_visualizar: any[] = [];
  niveles: any[] = [];
  isLoading: boolean = false;
  
  terminoGeneral: string = '';
  esNivelSerie: boolean = false; 

  usuarios_list: any[] = [];

  fecha_minima_hoy: string = '';
  
  titulosNiveles = [
    'Seccion Documental',
    'Sub Seccion Documental',
    'Sub Sub Seccion Docuemntal',
    'Serie',
    'Subserie',
    'Sub-subserie'
  ];
  proyectos: any;

  // PDF/visualización
  data: any = null;
  prestamoData: any = null;
  logoEmpresaBase64: string | null = null;
  pdfUrl: any = null;

  public filtro_tabla: string = '';
  public documentos_seleccionados: any[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    private toast: ToastrService,
    public certificadoService: CertificadoService,
    private cdr: ChangeDetectorRef,
    public modalService: NgbModal,
  ) { }

  ngOnInit(): void { 
    const userData = localStorage.getItem('user');
     if (userData) {
        this.user = JSON.parse(userData);
        this.id_empresa = this.user.id_empresa;

        this.numeroacta(this.id_empresa);
    }
      this.cargarProyectos();

      const hoy = new Date();
      const anio = hoy.getFullYear();
      const mes = String(hoy.getMonth() + 1).padStart(2, '0');
      const dia = String(hoy.getDate()).padStart(2, '0');
      
      this.fecha_minima_hoy = `${anio}-${mes}-${dia}`;
      
      if (!this.fecha_devolucion) {
        this.fecha_devolucion = this.fecha_minima_hoy;
      }
  }

  cargarProyectos() {
    if (!this.id_empresa) return;
    this.certificadoService.configProyectos(this.id_empresa)
      .subscribe({
        next: (resp: any) => {
          if (resp.proyectos && resp.proyectos.length > 0) {
            this.proyectos = resp.proyectos;
            this.niveles = [{ opciones: this.proyectos, seleccionado: null }];
            this.cdr.detectChanges(); 
          }
        },
        error: (err: any) => { 
          console.error('Error en la petición de proyectos:', err);
        }
      });
  }

  numeroacta(id_empresa: number) {
    if (!id_empresa) return;
  
    this.certificadoService.numeroActa(id_empresa).subscribe({
      next: (resp: any) => {
        if (resp && resp.formateado) {
          const y = new Date().getFullYear();
          this.numero_acta = `ATC-CER-${y}-${resp.formateado}`;
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

  seleccionarNivel(index: number) {
    const nivelActual = this.niveles[index];
    const seleccion = nivelActual.seleccionado;
  
    this.niveles.splice(index + 1);
  
    if (seleccion) {
      if (seleccion.documentos && seleccion.documentos.length > 0) {
        this.documentos_visualizar = seleccion.documentos;
      } else {
        this.documentos_visualizar = [];
      }
  
      let subOpciones = [];
      if (seleccion.subsecciones && seleccion.subsecciones.length > 0) {
        subOpciones = seleccion.subsecciones;
      } else if (seleccion.series && seleccion.series.length > 0) {
        subOpciones = seleccion.series;
      } else if (seleccion.hijos_recursivos && seleccion.hijos_recursivos.length > 0) {
        subOpciones = seleccion.hijos_recursivos;
      }
  
      if (subOpciones.length > 0) {
        this.niveles.push({
          opciones: subOpciones,
          seleccionado: null
        });
      }
    } else {
      this.documentos_visualizar = [];
    }
    this.cdr.detectChanges();
  }

  buscarTramite() {
    if (!this.id_empresa || !this.numero_tramite?.trim()) {
      this.toast.info('Ingrese un número de trámite para buscar');
      return;
    }
    this.certificadoService.buscarTramitePorNumero(this.id_empresa, this.numero_tramite.trim()).subscribe({
      next: (resp: any) => {
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
            this.numero_tramite = '';
            this.toast.info('No se encontraron trámites con ese número');
          }
        } else {
          this.id_tramite = null;
          this.numero_tramite = '';
          this.toast.info('No se encontraron trámites con ese número');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al buscar trámite', err);
        this.id_tramite = null;
        this.numero_tramite = '';
        this.toast.error('Error al buscar trámite');
        this.cdr.detectChanges();
      }
    });
  }

  dataBusqueda(page: number) {
    return { texto: this.texto, id_empresa: this.id_empresa };
  }

  private limpiarEstadoBusqueda() {
    this.resultados = [];
    this.total = 0;
    this.busquedaRealizada = false;
    this.criterioBusqueda = '';
  }

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
  
    this.certificadoService.buscarDocumentos(this.dataBusqueda(pageNumber), pageNumber).subscribe({
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
        console.error('Error al buscar documentos paginados:', err);
        Swal.close();
        this.toast.error('Error al cargar documentos');
      }
    });
  }

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

  toggleSeleccion(doc: any) {
    const index = this.documentos_seleccionados.findIndex(d => (d.id_documento || d.id) === (doc.id_documento || doc.id));
    if (index > -1) {
      this.documentos_seleccionados.splice(index, 1);
    } else {
      this.documentos_seleccionados.push(doc);
    }
  }

  isDocSelected(doc: any): boolean {
    const idDocTarget = doc?.id_documento ?? doc?.id;
    return this.documentos_seleccionados.some(d => (d.id_documento ?? d.id) === idDocTarget);
  }

  buscarUsuario() {
    if (!this.id_empresa) {
        this.toast.error('No hay un ID de empresa seleccionado');
        return;
    }

    if (!this.search_user || this.search_user.trim() === '') {
        this.toast.info('Por favor, ingrese un nombre o cédula');
        return;
    }

    this.certificadoService.buscarusuario(this.id_empresa, this.search_user).subscribe({
        next: (resp: any) => {
            if (resp && resp.usuarios && resp.usuarios.length > 0) {
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
      this.usuario_selected = user; 
      this.usuarios_list = [];      
      this.search_user = '';        
      this.cdr.detectChanges();
  }

  seleccionarDocumentoParaPrestamo(doc: any) {
      this.documento_selected = doc;
      this.cdr.detectChanges();
  }

  buscarDocumento() {
      if (!this.search_doc) {
          const ultimaSeleccion = this.niveles[this.niveles.length - 1].seleccionado;
          this.documentos_visualizar = ultimaSeleccion ? ultimaSeleccion.documentos : [];
          return;
      }
      
      this.documentos_visualizar = this.documentos_visualizar.filter(doc => 
          doc.nombre_archivo.toLowerCase().includes(this.search_doc.toLowerCase()) ||
          (doc.nro_caja && doc.nro_caja.toString().includes(this.search_doc))
      );
  }

  grabarBorrador() {
      if (!this.usuario_selected) {
          this.toast.error('Debe seleccionar un usuario solicitante');
          return;
      }
      if (!this.documentos_seleccionados || this.documentos_seleccionados.length === 0) {
          this.toast.error('Debe seleccionar por lo menos un documento para el acta.');
          return;
      }
      const userData = localStorage.getItem('user');
      if (!userData) {
          this.toast.error('Sesión caducada, por favor inicie sesión nuevamente');
          return;
      }
      const userLocal = JSON.parse(userData);
      const id_empresa = userLocal.id_empresa;
      this.isLoading = true;
      const dataActa = {
          id_empresa: id_empresa,
          id_usuario_solicitante: this.usuario_selected.id,
          id_usuario_responsable: userLocal.id,
          documentos_ids: this.documentos_seleccionados
              .map((doc: any) => doc.id || doc.id_documento) 
              .filter((id: any) => id != null),
          fecha_devolucion: this.fecha_devolucion,
          observaciones: this.observaciones,
          numero_acta: this.numero_acta,
          id_tramite: this.id_tramite ?? null,
          numero_tramite: this.numero_tramite ? this.numero_tramite.trim() : null,
          modo: 0,
          tipo_certificacion: 'CERTIFICACION'
      };

      this.certificadoService.guardarBorradorCertificacion(dataActa).subscribe({
          next: (resp: any) => {
              this.isLoading = false;
              if (resp.status === 200) {
                  this.toast.success('Borrador guardado correctamente.');
                  if (resp.acta) {
                    this.id_certificacion = resp.acta.id_certificacion || resp.acta.id || this.id_certificacion;
                  }
                  this.PrestamoC.emit(resp.acta); 
                  this.cdr.detectChanges();
              } else {
                  this.toast.error(resp.message || 'Error al guardar el borrador');
              }
          },
          error: (err) => {
              this.isLoading = false;
              console.error('Error al guardar borrador cert:', err);
              this.toast.error('Error de servidor al procesar el borrador');
              this.cdr.detectChanges();
          }
      });
  }

  verDocumentoActual() {
    if (!this.id_certificacion) {
      Swal.fire({
        icon: 'warning',
        title: 'Certificación no guardada',
        text: 'Todavía no está creada. Debe grabar el borrador primero para poder visualizar el documento.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Entendido'
      });
      return; 
    }

    const modalRef = this.modalService.open(VerCertificadoComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static'
    });

    (modalRef.componentInstance as any).id_certificacion = this.id_certificacion;
    (modalRef.componentInstance as any).id_empresa = this.id_empresa;  
    (modalRef.componentInstance as any).data = {
      observacion: this.observaciones,
      usuario_selected: this.usuario_selected,
      documentos: this.documentos_seleccionados
    };
  }

  CrearActa() {
      const userData = localStorage.getItem('user');
      if (!userData) {
          this.toast.error('Sesión caducada, inicie sesión nuevamente');
          return;
      }
      const userLocal = JSON.parse(userData);

      const payload = {
          id_empresa: this.id_empresa,
          id_certificacion: this.id_certificacion, 
          id_usuario: userLocal.id
      };

      if (!payload.id_certificacion) {
          this.toast.error('No se detectó un ID de certificación válido');
          return;
      }

      Swal.fire({
          title: '¿Está seguro de firmar y crear el acta?',
          text: 'Una vez firmado electrónicamente, este proceso es irreversible y no se podrá dar marcha atrás.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#1a365d',
          cancelButtonColor: '#718096',
          confirmButtonText: 'Sí, firmar y generar',
          cancelButtonText: 'Cancelar',
          heightAuto: false
      }).then((result) => {
          if (result.isConfirmed) {
              this.isLoading = true;
              this.certificadoService.registrarCertificacion(payload).subscribe({
                  next: (resp: any) => {
                      this.isLoading = false;
                      if (resp.status === 200) {
                          Swal.fire({
                              title: '¡Acta Firmada!',
                              text: resp.message || 'El acta ha sido generada y firmada digitalmente de forma correcta.',
                              icon: 'success',
                              confirmButtonColor: '#1a365d',
                              heightAuto: false
                          }).then(() => {
                              this.PrestamoC.emit(resp.data || true);
                              this.activeModal.close(resp.data || true);
                          });

                      } else {
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
