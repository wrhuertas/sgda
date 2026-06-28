import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { RecepcionService } from '../service/recepcion.service';
import { AsignarTramiteComponent } from '../asignar-tramite/asignar-tramite.component';
import { AuthService } from 'src/app/modules/auth';
import { VerDatosComponent } from '../ver-datos/ver-datos.component';
import { SeguimientoComponent } from '../seguimiento/seguimiento.component';
import { NuevoTramiteComponent } from '../nuevo-tramite/nuevo-tramite.component';
import Swal from 'sweetalert2';

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

  constructor(
      
        public modalService: NgbModal,
        public RecepcionService: RecepcionService,
        public toast: ToastrService,
        private cdr: ChangeDetectorRef,
        public authService: AuthService,
      ) { }
  
      ngOnInit(): void {
      
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');

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
        if (!this.id_empresa) return;
      
        // Opcional: limpiar la lista actual para dar feedback visual de carga
        // this.tramites = []; 
      
        this.RecepcionService
          .listTramites(this.id_empresa, page, this.search)
          .subscribe((resp: any) => {
            this.tramites = resp.data || [];
            this.totalPages = resp.total;
            this.currentPage = resp.current_page;
            
            // Si el usuario buscó algo y no hay resultados en ninguna categoría
            if (this.search && this.tramites.length === 0) {
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
        const diasTipo = item?.tipo_tramite_dias;
        if (diasTipo === null || diasTipo === undefined || diasTipo === '') return null;
        const totalDias = Number(diasTipo);
        if (!Number.isFinite(totalDias)) return null;

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
        if (dias === null) {
          return { label: '-', colorClass: 'badge-light', bloqueado: false };
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
      this.showAnexosModal = true;
      try { this.cdr.detectChanges(); } catch {}
    }

    cerrarAnexos() {
      this.showAnexosModal = false;
      this.anexosSeleccionados = [];
      this.tituloAnexos = '';
      try { this.cdr.detectChanges(); } catch {}
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






    loadPage($event: any) {
      this.listatramites($event);
    }
}
