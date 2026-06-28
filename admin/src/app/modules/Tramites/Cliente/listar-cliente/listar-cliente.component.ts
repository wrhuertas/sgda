import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ClienteService } from '../service/cliente.service';
import { EditarClienteComponent } from '../editar-cliente/editar-cliente.component';
import { EliminarClienteComponent } from '../eliminar-cliente/eliminar-cliente.component';
import { RegistrarClienteComponent } from '../registrar-cliente/registrar-cliente.component';
@Component({
  selector: 'app-listar-cliente',
  templateUrl: './listar-cliente.component.html',
  styleUrls: ['./listar-cliente.component.scss']
})
export class ListarClienteComponent {


  
     @Output() ClienteE: EventEmitter<any> = new EventEmitter();
      search: string = '';
      Clientes: any[] = [];
      isLoading$: any;
    
      totalPages: number = 0;
      currentPage: number = 1;
      usuarioActual: any = null;
      isSuperAdmin: boolean = false;
      loggedUser: any = {};
      userRole: string = '';
      ClienteDelAdmin: any = null;
      user: any;
    
      @Input() CLIENTE_SELECTED: any;
    
      nombre: string = '';
      estado: number = 1;
       id_empresa!: number;
    
      isLoading: any;
      private searchDebounceTimer: any = null;
    
      constructor(
        
          public modalService: NgbModal,
          public ClienteService: ClienteService,
          public toast: ToastrService,
          private cdr: ChangeDetectorRef
        ) { }
    
        
    ngOnInit(): void {
      this.user = JSON.parse(localStorage.getItem('user') || '{}');
  
      this.id_empresa = this.user.id_empresa; // 👈 AQUÍ SE GUARDA
  
      console.log('ID_EMPRESA:', this.id_empresa);
  
      this.isLoading$ = this.ClienteService.isLoading$;
  
      this.listClientes(); // 👈 YA TIENE EL ID
    }
  
    
    
    
    
      listClientes(page = 1) {
        if (!this.id_empresa) {
          this.toast.error('No se encontró la empresa del usuario');
          return;
        }

        this.ClienteService
          .listClientes(this.id_empresa, page, this.search)
          .subscribe((resp: any) => {
            console.log('Respuesta desde el Back:', resp);

            // CORRECCIÓN AQUÍ:
            // Como en tu controlador envías 'clientes', debes capturarlo así:
            this.Clientes = resp.clientes; 
            
            // El total para la paginación:
            this.totalPages = resp.total;
            
            // Nota: Si usas la respuesta personalizada del controlador, 
            // asegúrate de enviar también 'current_page' desde Laravel o manejarlo aquí
            this.currentPage = page; 
          });
      }

      onSearchChange() {
        if (this.searchDebounceTimer) {
          clearTimeout(this.searchDebounceTimer);
        }

        this.searchDebounceTimer = setTimeout(() => {
          this.currentPage = 1;
          this.listClientes(1);
        }, 350);
      }
  
  
  
    
    
        loadPage($event: any) {
          this.listClientes($event);
        }
    
      createCliente() {
        const modalRef = this.modalService.open(RegistrarClienteComponent, {
          centered: true,
          size: 'lg'
        });
      
        modalRef.componentInstance.ClienteC.subscribe(() => {
          // 🔥 vuelve a pedir al backend (ya viene completo)
          this.listClientes(this.currentPage);
        });
      }
      
    
      editCliente(Cliente: any) {
        const modalRef = this.modalService.open(EditarClienteComponent, { centered: true, size: 'lg' });
        modalRef.componentInstance.Cliente_SELECTED = Cliente;
    
        modalRef.componentInstance.ClienteE.subscribe((Cliente: any) => {
            this.listClientes(this.currentPage);
 
        });

      }
    
      deleteCliente(Cliente: any) {
        const modalRef = this.modalService.open(EliminarClienteComponent, { centered: true, size: 'md' });
        modalRef.componentInstance.Cliente_SELECTED = Cliente;

        modalRef.componentInstance.ClienteD.subscribe(() => {
          // Busca el índice correcto
          const INDEX = this.Clientes.findIndex((e: any) => e.id_cliente == Cliente.id_cliente);
          if (INDEX != -1) {
            this.Clientes.splice(INDEX, 1);  // Elimina del array
          }
        });
      }

    
    
    
    
    cerrarVistaCliente() {
     // this.vistaNoSuperAdminAbierta = false;
    }
    
    

}
