import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { AsignarTramiteComponent } from '../asignar-tramite.component';
import { AsignartramiteService } from '../service/asignartramite.service';
import { RegistrarAsignacionComponent } from '../registrar-asignacion/registrar-asignacion.component';

@Component({
  selector: 'app-list-tramites',
  templateUrl: './list-tramites.component.html',
  styleUrls: ['./list-tramites.component.scss']
})
export class ListTramitesComponent {

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

  user: any;

  isLoading: any;
  userLogeado: any;

    showAnexosModal = false;
  anexosSeleccionados: any[] = [];
  tituloAnexos = '';

  constructor(
      
        public modalService: NgbModal,
        public AsignarTramite: AsignartramiteService,
        public toast: ToastrService,
        private cdr: ChangeDetectorRef,
        public authService: AuthService,
      ) { }
  
      ngOnInit(): void {
      
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user || !user.id) {
        console.error('Usuario no logeado');
        this.toast.error('Usuario no logeado');
        return;
    }

    // Guardamos el objeto completo
    this.userLogeado = user; 
    
    // Mantenemos tus asignaciones actuales
    this.id_empresa = user.id_empresa;
    this.id_usuario = user.id;

    console.log('Objeto completo del usuario:', this.userLogeado);
        
        if (!user || !user.id) {
          console.error('Usuario no logeado');
          this.toast.error('Usuario no logeado');
          return;
        }

        this.id_usuario = user.id; 

        this.isLoading$ = this.AsignarTramite.isLoading$;
        this.listatramites();
        this.cargarArea();
        
      }





    listatramites(page = 1) {
      // 👈 AQUÍ PON EL LOG DEL USUARIO
  console.log('Usuario logeado actualmente:', {
    id: this.id_usuario,
    empresa: this.id_empresa
  });

  if (!this.id_empresa || !this.id_usuario) {
    this.toast.error('Datos del usuario incompletos');
    return;
  }

  this.AsignarTramite
    .listTramites(
      this.id_empresa,
      this.id_usuario, // 👈 NUEVO
      page,
      this.search
    )
    .subscribe((resp: any) => {
      console.log('Respuesta TRAMITES:', resp);

      this.tramites = resp.data ?? resp;
      this.totalPages = resp.total;
      this.currentPage = resp.current_page;
      this.cdr.detectChanges();
    });
}




       cargarArea() {
        const user = this.authService.user;

        if (!user || !user.id) {
          console.warn("No se encontró el usuario logeado");
          return;
        }

        console.log("ID USUARIO ENVIADO:", user.id);

        this.AsignarTramite.configArea(user.id).subscribe({
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

    filtrarTramites(prioridad: string) {
      if (!this.tramites || this.tramites.length === 0) return [];

      return this.tramites.filter(item => {
        const nombrePrioridad = (item?.tramite?.tipo_documento?.prioridad || item?.tramite?.tipo_documento?.nombre || '').toLowerCase();
        const p = prioridad.toLowerCase();

        if (p === 'urgente') return nombrePrioridad.includes('urgente');
        if (p === 'especial') return nombrePrioridad.includes('especial');

        if (p === 'normal') {
          return !nombrePrioridad.includes('urgente') && !nombrePrioridad.includes('especial');
        }

        return false;
      });
    }

    calcularDiasRestantes(item: any): number | null {
      const diasTipo = item?.tramite?.tipo_tramite?.tiempo_tramite;
      if (diasTipo === null || diasTipo === undefined || diasTipo === '') return null;
      const totalDias = Number(diasTipo);
      if (!Number.isFinite(totalDias)) return null;

      const createdAt = item?.tramite?.created_at;
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



   asignarTramite(tramite: any) {
      const modalRef = this.modalService.open(RegistrarAsignacionComponent, {
        centered: true,
        size: 'xl',
        backdrop: 'static'
      });

      // PASAMOS EL ID Y LOS DEMÁS DATOS
      modalRef.componentInstance.id_tramite = tramite.asignacion?.id_tramite || tramite.id_tramite; // obtener del ID del trámite en asignación
      modalRef.componentInstance.tramiteDatos = tramite;           // todo el objeto

      modalRef.componentInstance.areas = this.areas;
      modalRef.componentInstance.tramiteC.subscribe(() => {
        this.listatramites(this.currentPage);
      });
    }



    crearTramite() {}

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




    loadPage($event: any) {
      this.listatramites($event);
    }
}
