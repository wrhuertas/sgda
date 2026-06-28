import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TipodocumentoService } from '../service/tipodocumento.service';
import { EditarDocumentoComponent } from '../editar-documento/editar-documento.component';
import { EliminarDocumentoComponent } from '../eliminar-documento/eliminar-documento.component';
import { RegistrarDocumentoComponent } from '../registrar-documento/registrar-documento.component';

@Component({
  selector: 'app-listar-documento',
  templateUrl: './listar-documento.component.html',
  styleUrls: ['./listar-documento.component.scss']
})
export class ListarDocumentoComponent {


   @Output() TipoDocuemntoE: EventEmitter<any> = new EventEmitter();
    search: string = '';
    TipoDocumentos: any[] = [];
    isLoading$: any;
  
    totalPages: number = 0;
    currentPage: number = 1;
    usuarioActual: any = null;
    isSuperAdmin: boolean = false;
    loggedUser: any = {};
    userRole: string = '';
    TipoDocumentoDelAdmin: any = null;
    user: any;
  
    @Input() TIPODOCUMENTO_SELECTED: any;
  
    nombre: string = '';
    estado: number = 1;
     id_empresa!: number;
  
    isLoading: any;
  
    constructor(
      
        public modalService: NgbModal,
        public TipoDocumentoService: TipodocumentoService,
        public toast: ToastrService,
        private cdr: ChangeDetectorRef
      ) { }
  
      
  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('user') || '{}');

    this.id_empresa = this.user.id_empresa; // 👈 AQUÍ SE GUARDA

    console.log('ID_EMPRESA:', this.id_empresa);

    this.isLoading$ = this.TipoDocumentoService.isLoading$;

    this.listTipoDocumentos(); // 👈 YA TIENE EL ID
  }

  
  
  
  
     listTipoDocumentos(page = 1) {

        if (!this.id_empresa) {
          this.toast.error('No se encontró la empresa del usuario');
          return;
        }

        this.TipoDocumentoService
          .listTipoDocumento(
            this.id_empresa, // 👈 PRIMERO SIEMPRE
            page,
            this.search
          )
          .subscribe((resp: any) => {

            console.log('Respuesta TipoDocumentos:', resp);

            this.TipoDocumentos = resp.data ?? resp;
            this.totalPages = resp.total;
            this.currentPage = resp.current_page;
          });
      }




  
  
      loadPage($event: any) {
        this.listTipoDocumentos($event);
      }
  
    createTipoDocumento() {
      const modalRef = this.modalService.open(RegistrarDocumentoComponent, {
        centered: true,
        size: 'lg'
      });
    
      modalRef.componentInstance.TipoDocumentoC.subscribe(() => {
        // 🔥 vuelve a pedir al backend (ya viene completo)
        this.listTipoDocumentos(this.currentPage);
      });
    }
    
  
  

    editTipoDocumento(TipoDocumento: any) {
      const modalRef = this.modalService.open(EditarDocumentoComponent, { centered: true, size: 'lg' });
      modalRef.componentInstance.TIPODOCUMENTO_SELECTED = TipoDocumento;
  
      modalRef.componentInstance.ClienteE.subscribe((Cliente: any) => {
          this.listTipoDocumentos(this.currentPage);

      });

    }
  
    deleteTipoDocumento(TipoDocumento: any) {
      const modalRef = this.modalService.open(EliminarDocumentoComponent, { centered: true, size: 'md' });
      modalRef.componentInstance.TIPODOCUMENTO_SELECTED = TipoDocumento;
  
      modalRef.componentInstance.TipoDocumentoD.subscribe(() => {
        const INDEX = this.TipoDocumentos.findIndex((e: any) => e.id == TipoDocumento.id);
        if (INDEX != -1) {
          this.TipoDocumentos.splice(INDEX, 1);
        }
      });
    }
  
  
  
  
  cerrarVistaTipoDocumento() {
   // this.vistaNoSuperAdminAbierta = false;
  }
  
  
  
  




}
