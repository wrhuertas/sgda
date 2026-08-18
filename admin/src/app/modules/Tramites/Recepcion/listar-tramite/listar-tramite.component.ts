import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { URL_SERVICIOS, URL_BACKEND } from 'src/app/config/config';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { RecepcionService } from '../service/recepcion.service';
import { AsignarTramiteComponent } from '../asignar-tramite/asignar-tramite.component';
import { AuthService } from 'src/app/modules/auth';
import { VerDatosComponent } from '../ver-datos/ver-datos.component';
import { SeguimientoComponent } from '../seguimiento/seguimiento.component';
import { NuevoTramiteComponent } from '../nuevo-tramite/nuevo-tramite.component';
import Swal from 'sweetalert2';
import { MoverTramitesMasivoComponent } from '../mover-tramites-masivo/mover-tramites-masivo.component';
import { DocumentoViewerService } from 'src/app/modules/indexacion-serie/ver-documento/documento-viewer.service';

@Component({
  selector: 'app-listar-tramite',
  templateUrl: './listar-tramite.component.html',
  styleUrls: ['./listar-tramite.component.scss']
})
export class ListarTramiteComponent {
@Output() TramitesE: EventEmitter<any> = new EventEmitter();
  search: string = '';
  tramites: any[] = [];
  isLoading$: any;

  // Controla la visibilidad del botón "Enviar Trámites"
  showEnviarButton: boolean = false;

  // Selección de filas
  selectedTramites: Set<number> = new Set<number>();
  selectAllChecked: boolean = false;

  isSelected(item: any): boolean {
    return this.selectedTramites.has(Number(item?.id_tramite));
  }

  toggleSelection(item: any, checked: boolean) {
    const id = Number(item?.id_tramite);
    if (!id) return;
    if (checked) this.selectedTramites.add(id);
    else this.selectedTramites.delete(id);

    // Actualizar estado de select all
    this.selectAllChecked = this.tramites && this.tramites.length > 0 && this.tramites.every((t: any) => this.selectedTramites.has(Number(t.id_tramite)));
    // Mostrar el botón de enviar sólo si hay más de 1 seleccionado
    this.showEnviarButton = this.selectedTramites.size > 1;
  }

  toggleSelectAll(checked: boolean) {
    this.selectAllChecked = checked;
    this.selectedTramites.clear();
    if (checked && this.tramites && this.tramites.length) {
      for (const t of this.tramites) {
        if (t && t.id_tramite) this.selectedTramites.add(Number(t.id_tramite));
      }
    }
    // Actualizar visibilidad del botón según la cantidad seleccionada
    this.showEnviarButton = this.selectedTramites.size > 1;
  }

  id_empresa!: number;
@Input() TRAMITE_SELECTED: any;

  nombre: string = '';
  estado: number = 1;
  totalPages: number = 0;
  currentPage: number = 1;
  areas: any[] = []; // cargar desde backend

  user: any;

  isLoading: any;

  // Modal de anexos
  showAnexosModal = false;
  anexosSeleccionados: any[] = [];
  tituloAnexos = '';
  oficioAnexos = '';
  usuario_id: number | null = null;
  // (no preview state) sólo lista de anexos

  constructor(
      
        public modalService: NgbModal,
        public RecepcionService: RecepcionService,
        public toast: ToastrService,
        private cdr: ChangeDetectorRef,
        public authService: AuthService,
        private documentoViewer: DocumentoViewerService,
      ) { }

    // Ver un anexo en el modal-plantilla (VerDocumentoComponent).
    // Se trae el PDF como base64 vía API para evitar problemas de CORS con /storage.
    verAnexo(a: any) {
      const ruta = (a?.ruta || '').toString().trim();
      if (!ruta) { this.toast.warning('No se encontró la ruta del anexo'); return; }

      Swal.fire({ title: 'Cargando anexo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      this.RecepcionService.verAnexoBase64(ruta).subscribe({
        next: (resp: any) => {
          try { Swal.close(); } catch {}
          if (resp?.success && resp?.base64) {
            this.documentoViewer.abrirVer({ pdfBase64: resp.base64 });
          } else {
            this.toast.error(resp?.message || 'No se pudo obtener el anexo');
          }
        },
        error: (err) => {
          try { Swal.close(); } catch {}
          console.error('Error trayendo anexo:', err);
          this.toast.error('No se pudo cargar el anexo');
        }
      });
    }
  
      ngOnInit(): void {
      
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        this.usuario_id = user?.id ?? null;

        if (user && user.id_empresa) {
          this.id_empresa = user.id_empresa;
        } else {
          console.error('Usuario sin empresa:', user);
        }

        this.isLoading$ = this.RecepcionService.isLoading$;
        this.listatramites();
        this.cargarArea();
        
      }





      listatramites(page = 1) {
        // El listado se muestra a todo usuario con usuario_recepcionista = 1,
        // aunque no tenga empresa asignada.

        // Opcional: limpiar la lista actual para dar feedback visual de carga
        // this.tramites = []; 
      
        this.RecepcionService
          .listTramites(this.id_empresa, page, this.search, this.usuario_id)
          .subscribe((resp: any) => {
            this.tramites = resp.data || [];
            this.totalPages = resp.total;
            this.currentPage = resp.current_page;

            // Usuario no autorizado (no es recepcionista): aviso claro
            if (resp?.message) {
              this.toast.warning(resp.message);
            }
            // Si el usuario buscó algo y no hay resultados en ninguna categoría
            else if (this.search && this.tramites.length === 0) {
              this.toast.info('No se encontraron trámites con esos criterios');
            }
      
            this.cdr.detectChanges();
          });
      }
      
      filtrarTramites(prioridad: string) {
         if (!this.tramites || this.tramites.length === 0) return [];
       
         return this.tramites.filter(item => {
           const p = prioridad.toLowerCase();
       
           // Nueva categoría: Rechazados por estado_registro = 3
           if (p === 'rechazados') return Number(item?.estado_registro) === 3;

           // Usar el campo categoria si existe
           const categoria = (item?.categoria || '').toLowerCase();
           if (categoria) {
             if (p === 'urgente') return categoria === 'urgente';
             if (p === 'especial') return categoria === 'especial';
             if (p === 'normal') return categoria === 'normal';
           }
           
           // Fallback: si no tiene categoría, usar tipo_documento_prioridad
           const prioridadDoc = (item.tipo_documento_prioridad || '').toLowerCase();
           const nombreDoc = (item.tipo_documento_nombre || '').toLowerCase();
           const etiqueta = prioridadDoc || nombreDoc;

           if (p === 'urgente') return etiqueta.includes('urgente');
           if (p === 'especial') return etiqueta.includes('especial');
           
           if (p === 'normal') {
             // Es "Normal" si no contiene las otras palabras clave
             return !etiqueta.includes('urgente') && !etiqueta.includes('especial');
           }
       
           return false;
         });
       }

      getPrioridadBadge(item: any): { label: string; cls: string } {
        const p = String(item?.tipo_documento_prioridad || '').toLowerCase();
        if (p.includes('urgente')) return { label: 'Urgente', cls: 'badge-light-danger' };
        if (p.includes('especial')) return { label: 'Especial', cls: 'badge-light-primary' };
        if (p.includes('normal')) return { label: 'Normal', cls: 'badge-light-success' };
        // fallback por nombre si no hay prioridad explícita
        const n = String(item?.tipo_documento_nombre || '').toLowerCase();
        if (n.includes('urgente')) return { label: 'Urgente', cls: 'badge-light-danger' };
        if (n.includes('especial')) return { label: 'Especial', cls: 'badge-light-primary' };
        return { label: 'Normal', cls: 'badge-light-success' };
      }

      calcularDiasRestantes(item: any): number | null {
        // Buscar el número de días en varias ubicaciones que puede enviar el backend
        // Prioridad: item.info_tipo.dias -> item.dias -> item.tipo_tramite_dias
        let diasTipo: any = null;
        if (item?.info_tipo && (item.info_tipo.dias !== undefined && item.info_tipo.dias !== null && item.info_tipo.dias !== '')) {
          diasTipo = item.info_tipo.dias;
        } else if (item?.dias !== undefined && item.dias !== null && item.dias !== '') {
          diasTipo = item.dias;
        } else if (item?.tipo_tramite_dias !== undefined && item.tipo_tramite_dias !== null && item.tipo_tramite_dias !== '') {
          diasTipo = item.tipo_tramite_dias;
        }

        if (diasTipo === null || diasTipo === undefined || diasTipo === '') return null;

        const totalDias = Number(diasTipo);
        if (!Number.isFinite(totalDias)) return null;
        // Si el backend indica 0 días, consideramos que no tiene tiempo asignado
        if (totalDias === 0) return null;

        const createdAt = item?.created_at;
        if (!createdAt) return null;

        const inicio = new Date(createdAt);
        if (isNaN(inicio.getTime())) return null;

        const ahora = new Date();
        const diffMs = ahora.getTime() - inicio.getTime();
        const diasTranscurridos = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return totalDias - diasTranscurridos;
      }

      calcularVigencia(item: any): { label: string; colorClass: string; bloqueado: boolean } {
        const dias = this.calcularDiasRestantes(item);
        // Si no hay información de tiempo en el backend, mostrar texto claro
        if (dias === null) {
          return { label: 'NO TIENE TIEMPO', colorClass: 'badge-light-dark', bloqueado: false };
        }

        if (dias >= 3) return { label: 'Vigente', colorClass: 'badge-light-success', bloqueado: false };
        if (dias >= 1) return { label: 'Próximo a Vencer', colorClass: 'badge-light-warning', bloqueado: false };
        return { label: 'Caducado', colorClass: 'badge-light-danger', bloqueado: true };
      }


       cargarArea() {
        const user = this.authService.user;

        if (!user || !user.id) {
          console.warn("No se encontró el usuario logeado");
          return;
        }

        console.log("ID USUARIO ENVIADO:", user.id);

        this.RecepcionService.configArea(user.id).subscribe({
          next: (resp: any) => {
            console.log("Respuesta recibida del servidor:", resp);

            if (resp && resp.areas) {
              this.areas = resp.areas;
              console.log("Áreas asignadas correctamente:", this.areas);
            } else {
              console.error("La respuesta no contiene 'areas'", resp);
              this.areas = [];
            }

            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error("Error en la petición de Áreas:", err);
            this.toast.error('No se pudo cargar las áreas');
          }
        });
      }



      crearTramite() {
        const user = this.authService.user;
      
        // --- ABRE EL MODAL DIRECTO COMO EN TU EJEMPLO DE SEGUIMIENTO ---
        const modalRef = this.modalService.open(NuevoTramiteComponent, {
          centered: true,
          size: 'xl',
          backdrop: 'static'
        });
      
        // PASAMOS LOS DATOS QUE NECESITAS
        modalRef.componentInstance.id_usuario = user.id;
        modalRef.componentInstance.id_empresa = this.id_empresa;
      
        // Si necesitas pasar algún dato vacío o inicial para que no truene:
        modalRef.componentInstance.id_tipo_documento = null; 
        modalRef.componentInstance.nombre_tipo_documento = '';
      
        modalRef.componentInstance.tramiteC.subscribe(() => {
          this.listatramites(this.currentPage);
        });
        // -------------------------------------------------------------
      }
    
      abrirModalNuevoTramite(idTipo: any, nombreTipo: string) {
        const modalRef = this.modalService.open(NuevoTramiteComponent, {
          centered: true,
          size: 'xl',
          backdrop: 'static'
        });
    
        // Pasamos ambos datos al componente hijo
        modalRef.componentInstance.id_tipo_documento = idTipo;
        modalRef.componentInstance.nombre_tipo_documento = nombreTipo;
    
        modalRef.componentInstance.tramiteC.subscribe(() => {
          this.listatramites();
        });
      }

 

    


      verSeguimiento(tramite: any) {
      const modalRef = this.modalService.open(SeguimientoComponent, {
        centered: true,
        size: 'xl',
        backdrop: 'static'
      });

      // PASAMOS EL ID Y LOS DEMÁS DATOS
      modalRef.componentInstance.id_tramite = tramite.id_tramite; // solo el ID
      modalRef.componentInstance.tramiteDatos = tramite;           // todo el objeto

      modalRef.componentInstance.areas = this.areas;
      modalRef.componentInstance.tramiteC.subscribe(() => {
        this.listatramites(this.currentPage);
      });
    }





    asignarTramite(tramite: any) {
      const modalRef = this.modalService.open(AsignarTramiteComponent, {
        centered: true,
        size: 'xl',
        backdrop: 'static'
      });

      // PASAMOS EL ID Y LOS DEMÁS DATOS
      modalRef.componentInstance.id_tramite = tramite.id_tramite; // solo el ID
      modalRef.componentInstance.tramiteDatos = tramite;           // todo el objeto

      modalRef.componentInstance.areas = this.areas;
      modalRef.componentInstance.tramiteC.subscribe(() => {
        this.listatramites(this.currentPage);
      });
    }

    // Abrir modal local para ver anexos
  abrirAnexos(tramite: any) {
      const anexos = Array.isArray(tramite?.anexos) ? tramite.anexos : [];
      this.anexosSeleccionados = anexos;
      this.tituloAnexos = `Anexos del Trámite ${tramite?.numero_tramite || ''}`.trim();
      this.oficioAnexos = `${tramite?.num_documento_interno || ''}`.trim();
      this.showAnexosModal = true;
      // no preview behavior; sólo abrir modal con lista de anexos
      try { this.cdr.detectChanges(); } catch {}
    }

    cerrarAnexos() {
      this.showAnexosModal = false;
      this.anexosSeleccionados = [];
      this.tituloAnexos = '';
      this.oficioAnexos = '';
      try { this.cdr.detectChanges(); } catch {}
    }

  // Construye la URL pública del anexo usando la base de servicios backend
  getAnexoUrl(anexo: any): string {
    try {
      const raw = (anexo?.ruta || '').toString().trim();
      if (!raw) return '';

      // Si ya es una URL absoluta, devolverla tal cual
      if (/^https?:\/\//i.test(raw)) return raw;

      // Si la ruta ya contiene 'storage/', evitar duplicarlo
      let cleanRuta = raw.replace(/^\/+/, '');
      if (cleanRuta.includes('/storage/')) {
        // Puede venir como 'storage/...' o '/storage/...'
        cleanRuta = cleanRuta.replace(/^(?:storage\/)+/, '');
        const base = (URL_BACKEND || URL_SERVICIOS || '').toString().replace(/\/+$/, '');
        const url = `${base}/storage/${cleanRuta}`;
        console.debug('[ListarTramite] anexo URL (normalized storage):', url);
        return encodeURI(url);
      }

      // Ruta relativa normal: unir con la base del backend (no el prefijo /api)
      const base = (URL_BACKEND || URL_SERVICIOS || '').toString().replace(/\/+$/, '');
      const url = `${base}/storage/${cleanRuta}`;
      console.debug('[ListarTramite] anexo URL:', url);
      return encodeURI(url);
    } catch (e) {
      console.warn('[ListarTramite] error building anexo url', e, anexo);
      return (anexo?.ruta || '');
    }
  }

  



  verMasDatos(tramite: any) {
      const modalRef = this.modalService.open(VerDatosComponent, {
        centered: true,
        size: 'xl',
        backdrop: 'static'
      });

      // PASAMOS EL ID Y LOS DEMÁS DATOS
      modalRef.componentInstance.id_tramite = tramite.id_tramite; // solo el ID
      modalRef.componentInstance.tramiteDatos = tramite;           // todo el objeto

      modalRef.componentInstance.areas = this.areas;
      modalRef.componentInstance.tramiteC.subscribe(() => {
        this.listatramites(this.currentPage);
      });
    }



  enviarTramitesMasivo() {
  // Recolectar IDs seleccionados y validar
  const ids = Array.from(this.selectedTramites || []).map(x => Number(x)).filter(Boolean);
  // Mostrar solo si hay más de 1 seleccionado
  if (!ids || ids.length === 0) {
    this.toast.info('Seleccione al menos un trámite para mover');
    return;
  }

  

  if (ids.length === 1) {
    // No permitimos abrir el modal con solo 1 trámite seleccionado
    this.toast.info('Seleccione al menos 2 trámites para enviar de forma masiva');
    return;
  }

  const modalRef = this.modalService.open(MoverTramitesMasivoComponent, {
    // Definimos la clase para identificar el modal
    windowClass: 'modal-ancho-personalizado', 
    centered: true,
    backdrop: 'static'
  });

  // Ajuste directo del ancho:
  // Al usar setTimeout aseguramos que el modal ya se haya renderizado en el DOM
  setTimeout(() => {
    const modalElement = document.querySelector('.modal-ancho-personalizado .modal-dialog') as HTMLElement;
    if (modalElement) {
      modalElement.style.maxWidth = '95%'; // Aquí ajustas el ancho que quieras
      modalElement.style.width = '95%';
    }
  });
  
  // Pasamos únicamente las áreas al componente hijo
  modalRef.componentInstance.areas = this.areas;
  // Pasamos los IDs seleccionados al componente de mover masivo
  modalRef.componentInstance.selectedTramitesIds = ids;

  // Nos suscribimos de forma segura
  modalRef.componentInstance.tramiteC.subscribe(() => {
    setTimeout(() => {
      this.listatramites(this.currentPage);
      // Limpiar selección y ocultar botón al regresar de registro
      try {
        this.selectedTramites.clear();
        this.selectAllChecked = false;
        this.showEnviarButton = false;
        this.cdr.detectChanges();
      } catch (e) {}
    });
  });
}


    loadPage($event: any) {
      this.listatramites($event);
    }
}
