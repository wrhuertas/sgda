import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { RegistrarAsignacionComponent } from '../../asignar-tramite/registrar-asignacion/registrar-asignacion.component';
import { HistorialtramiteService } from '../service/historialtramite.service';
import { AsignarTramiteComponent } from '../asignar-tramite/asignar-tramite.component';
import { NuevoTramiteComponent } from '../nuevo-tramite/nuevo-tramite.component';

@Component({
  selector: 'app-listado-tramite',
  templateUrl: './listado-tramite.component.html',
  styleUrls: ['./listado-tramite.component.scss']
})
export class ListadoTramiteComponent {



  @Output() TramitesE: EventEmitter<any> = new EventEmitter();
    search: string = '';
    tramites: any[] = [];
    isLoading$: any;
  
    id_empresa!: number;
    id_usuario!: number;
  @Input() TRAMITE_SELECTED: any;
  
    nombre: string = '';
    estado: number = 1;
    totalPages: number = 0;
    currentPage: number = 1;
    areas: any[] = []; // cargar desde backend
    historial: any[] = [];

     // Modal de anexos
  showAnexosModal = false;
  anexosSeleccionados: any[] = [];
  tituloAnexos = '';

    user: any;
  
    isLoading: any;
  
    constructor(
        
          public modalService: NgbModal,
          public historialTramite: HistorialtramiteService,
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
          
          if (!user || !user.id) {
            console.error('Usuario no logeado');
            this.toast.error('Usuario no logeado');
            return;
          }
  
          this.id_usuario = user.id;
          console.log('ID Usuario logeado:', this.id_usuario);

          this.isLoading$ = this.historialTramite.isLoading$;
          this.listatramites();
          this.cargarArea();
          
        }
  
  
  
  
  
        listatramites(page = 1) {

          if (!this.id_empresa || !this.id_usuario) {
            this.toast.error('Datos del usuario incompletos');
            return;
          }
        
          this.historialTramite
            .listTramites(
              this.id_empresa,
              this.id_usuario,
              page,
              this.search
            )
            .subscribe((resp: any) => {
        
              console.log('Respuesta TRAMITES HISTORIAL:', resp);
        
              // 🔥 AQUÍ ESTABA TODO EL PROBLEMA
              this.tramites = resp.data ?? [];
        
              this.totalPages = resp.total ?? 0;
              this.currentPage = page;
        
            });
        }
        
        

  
  
  
  
        cargarArea() {
          const user = this.authService.user;
  
          if (!user || !user.id) {
            console.warn("No se encontró el usuario logeado");
            return;
          }
  
          console.log("ID USUARIO ENVIADO:", user.id);
  
          this.historialTramite.configArea(user.id).subscribe({
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
  
  
  
        // listar-tramite.component.ts
  
      verMasDatos(item: any): void {
        console.log('Más datos del trámite:', item);
  
        // Aquí luego puedes abrir un modal
        // this.modalService.open(...)
      }
  
      verSeguimiento(item: any): void {
        console.log('Seguimiento del trámite:', item);
  
        // Aquí luego puedes redirigir o abrir timeline
        // this.router.navigate(['/tramites/seguimiento', item.id_tramite]);
      }
  
  
  
     asignarTramite(tramite: any) {
        const modalRef = this.modalService.open(AsignarTramiteComponent, {
          centered: true,
          size: 'lg',
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
  
    filtrarTramites(prioridad: string) {
        if (!this.tramites || this.tramites.length === 0) return [];
      
        return this.tramites.filter(item => {
          const p = prioridad.toLowerCase();
          
          // "Recibidos" - muestra todos los trámites con estado_tramite = DERIVAR (recibidos y enviados juntos)
          if (p === 'recibidos') {
            const estadoTramite = (item.estado_tramite || '').toUpperCase();
            // Mostrar si estado_tramite es DERIVAR o NULL (es decir, no es RECHAZAR ni FINALIZAR)
            return (estadoTramite === 'DERIVAR' || estadoTramite === '');
          }
          
          // Filtrar por estado_tramite para Rechazado y Finalizados
          if (p === 'rechazado') {
            return (item.estado_tramite || '').toUpperCase() === 'RECHAZAR';
          }
          
          if (p === 'finalizados') {
            return (item.estado_tramite || '').toUpperCase() === 'FINALIZAR';
          }
          
          // Para categorías con tipo de documento (Copia, etc)
          const prioridadDoc = (item.tipo_documento_prioridad || '').toLowerCase();
          const nombreDoc = (item.tipo_documento_nombre || '').toLowerCase();
          const etiqueta = prioridadDoc || nombreDoc; // usar prioridad si existe
      
          if (p === 'urgente') return etiqueta.includes('urgente');
          if (p === 'especial') return etiqueta.includes('especial');
      
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

      // Mapea los títulos visibles de las secciones sin cambiar la lógica actual de filtrado
      mapTitulo(cat: string): string {
        const c = String(cat).toLowerCase();
        if (c === 'recibidos') return 'Recibidos y Enviados';
        if (c === 'especial') return 'Copia';
        if (c === 'rechazado') return 'Rechazado';
        if (c === 'finalizados') return 'Finalizados';
        return cat;
      }

      // Abrir modal local para ver anexos
    abrirAnexos(tramite: any) {
      const anexos = Array.isArray(tramite?.anexos) ? tramite.anexos : [];
      this.anexosSeleccionados = anexos;
      this.tituloAnexos = `Anexos del Trámite ${tramite?.numero_tramite || ''}`.trim();
      this.showAnexosModal = true;
      try { this.cdr.detectChanges(); } catch {}
    }
  
  
      loadPage($event: any) {
        this.listatramites($event);
      }

}
