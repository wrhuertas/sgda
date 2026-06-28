import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AreaService } from '../service/area.service';
import { EditarAreaComponent } from '../editar-area/editar-area.component';
import { RegistrarAreaComponent } from '../registrar-area/registrar-area.component';
import { EliminarAreaComponent } from '../eliminar-area/eliminar-area.component';

@Component({
  selector: 'app-listar-area',
  templateUrl: './listar-area.component.html',
  styleUrls: ['./listar-area.component.scss']
})
export class ListarAreaComponent {
  @Output() AreaE: EventEmitter<any> = new EventEmitter();
  search: string = '';
  areas: any[] = [];
  isLoading$: any;

  totalPages: number = 0;
  currentPage: number = 1;
  usuarioActual: any = null;
  isSuperAdmin: boolean = false;
  loggedUser: any = {};
  userRole: string = '';
  AreaDelAdmin: any = null;


  @Input() AREA_SELECTED: any;

  nombre: string = '';
  estado: number = 1;

  id_empresa!: number;
  isLoading: any;

  constructor(
    
      public modalService: NgbModal,
      public AreaService: AreaService,
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


      this.isLoading$ = this.AreaService.isLoading$;
      this.listareas();
      
    }




   listareas(page = 1) {


    if (!this.id_empresa) {
          this.toast.error('No se encontró la empresa del usuario');
          return;
        }
    this.AreaService.listAreas(
            this.id_empresa, // 👈 PRIMERO SIEMPRE
            page,
            this.search
          ).subscribe((resp: any) => {
      console.log('Respuesta areas:', resp);

      this.areas = resp.data;           // 👈 CLAVE
      this.totalPages = resp.total;
      this.currentPage = resp.current_page;
    });
  }


    loadPage($event: any) {
      this.listareas($event);
    }

  createArea() {
  const modalRef = this.modalService.open(RegistrarAreaComponent, {
    centered: true,
    size: 'lg'
  });

  modalRef.componentInstance.AreaC.subscribe(() => {
    // 🔥 vuelve a pedir al backend (ya viene completo)
    this.listareas(this.currentPage);
  });
}



  editArea(AREA: any) {
    const modalRef = this.modalService.open(EditarAreaComponent, { centered: true, size: 'lg' });
    modalRef.componentInstance.AREA_SELECTED = AREA;

    modalRef.componentInstance.AreaE.subscribe(() => {
      // 🔹 Una vez que se emite la actualización, recargamos la lista
      this.listareas(this.currentPage); // <-- refresca la lista manteniendo la página actual
    });
  }


  deleteArea(AREA: any) {
    const modalRef = this.modalService.open(EliminarAreaComponent, { centered: true, size: 'md' });
    modalRef.componentInstance.AREA_SELECTED = AREA;

    modalRef.componentInstance.AreaD.subscribe(() => {
      // 🔹 En lugar de eliminar del array, recargamos toda la lista
      this.listareas(this.currentPage); // refresca la tabla mostrando solo áreas activas
    });
  }





cerrarVistaArea() {
 // this.vistaNoSuperAdminAbierta = false;
}






}
