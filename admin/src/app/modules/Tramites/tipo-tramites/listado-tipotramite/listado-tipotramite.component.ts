import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { CrearTipotramiteComponent } from '../crear-tipotramite/crear-tipotramite.component';
import { EditarTipotramiteComponent } from '../editar-tipotramite/editar-tipotramite.component';
import { EliminarTipotramiteComponent } from '../eliminar-tipotramite/eliminar-tipotramite.component';
import { TipotramitesService } from '../service/tipotramites.service';

@Component({
  selector: 'app-listado-tipotramite',
  templateUrl: './listado-tipotramite.component.html',
  styleUrls: ['./listado-tipotramite.component.scss']
})
export class ListadoTipotramiteComponent {

  @Output() TipotramiteE: EventEmitter<any> = new EventEmitter();
  search: string = '';
  tipotramites: any[] = [];
  isLoading$: any;

  totalPages: number = 0;
  currentPage: number = 1;
  usuarioActual: any = null;
  isSuperAdmin: boolean = false;
  loggedUser: any = {};
  userRole: string = '';
  AreaDelAdmin: any = null;


  @Input() TIPOTRAMITE_SELECTED: any;

  nombre: string = '';
  estado: number = 1;

  id_empresa!: number;
  isLoading: any;

  constructor(
    
      public modalService: NgbModal,
      public TipotramiteService: TipotramitesService,
      public toast: ToastrService,
      private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (user && user.id_empresa) {
        this.id_empresa = user.id_empresa;
      } else {
        console.error('Usuario sin empresa:', user);
      }


      this.isLoading$ = this.TipotramiteService.isLoading$;
      this.listarTipoTramites();
      
    }




    listarTipoTramites(page = 1) {


    if (!this.id_empresa) {
          this.toast.error('No se encontró la empresa del usuario');
          return;
        }
    this.TipotramiteService.listTipoTramites(
            this.id_empresa, // 👈 PRIMERO SIEMPRE
            page,
            this.search
          ).subscribe((resp: any) => {
      console.log('Respuesta tipotramitess:', resp);

      this.tipotramites = resp.data;           // 👈 CLAVE
      this.totalPages = resp.total;
      this.currentPage = resp.current_page;
    });
  }


    loadPage($event: any) {
      this.listarTipoTramites($event);
    }

    crearTipoTramite() {
  const modalRef = this.modalService.open(CrearTipotramiteComponent, {
    centered: true,
    size: 'lg'
  });

  modalRef.componentInstance.TipotramitesC.subscribe(() => {
    // 🔥 vuelve a pedir al backend (ya viene completo)
    this.listarTipoTramites(this.currentPage);
  });
}



editTipoTramite(TIPOTRAMITE: any) {
    const modalRef = this.modalService.open(EditarTipotramiteComponent, { centered: true, size: 'lg' });
    modalRef.componentInstance.TIPOTRAMITE_SELECTED = TIPOTRAMITE;

    modalRef.componentInstance.TipotramitesE.subscribe(() => {
      // 🔹 Una vez que se emite la actualización, recargamos la lista
      this.listarTipoTramites(this.currentPage); // <-- refresca la lista manteniendo la página actual
    });
  }


  deleteTipoTramite(TIPOTRAMITE: any) {
    const modalRef = this.modalService.open(EliminarTipotramiteComponent, { centered: true, size: 'md' });
    modalRef.componentInstance.TIPOTRAMITE_SELECTED = TIPOTRAMITE;

    modalRef.componentInstance.TipotramitesD.subscribe(() => {
      // 🔹 En lugar de eliminar del array, recargamos toda la lista
      this.listarTipoTramites(this.currentPage); // refresca la tabla mostrando solo áreas activas
    });
  }





cerrarVistaArea() {
 // this.vistaNoSuperAdminAbierta = false;
}





}
