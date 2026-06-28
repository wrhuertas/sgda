import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { BusquedaService } from '../service/busqueda.service';

@Component({
  selector: 'app-info-documento',
  templateUrl: './info-documento.component.html',
  styleUrls: ['./info-documento.component.scss']
})
export class InfoDocumentoComponent implements OnInit {

  // Estos nombres deben coincidir exactamente con los que usaste en:
  // modalRef.componentInstance.idDocumento
  @Input() idDocumento: any;
  @Input() idEmpresa: any;

  detalle: any = null;
  cargando: boolean = false;

  constructor(public activeModal: NgbActiveModal,private busquedaService: BusquedaService,  
    private cdr: ChangeDetectorRef,
    public modalService: NgbModal,
     private toast: ToastrService,) {}

  ngOnInit(): void {
    // Aquí ya tienes acceso a los IDs
    console.log('ID del Documento recibido:', this.idDocumento);
    console.log('ID de la Empresa recibido:', this.idEmpresa);

    if (this.idDocumento) {
      this.cargarDetalleDocumento();
    }
  }

  cargarDetalleDocumento() {
    this.cargando = true;
  
    // 1. Preparamos el payload tal como el ejemplo
    const payload = {
      idDocumento: this.idDocumento,
      idEmpresa: this.idEmpresa,
    };
  
    // 2. Llamamos al servicio (asegúrate de usar busquedaService)
    this.busquedaService.getDetalleDocumento(this.idDocumento, this.idEmpresa)
    .subscribe({
      next: (resp: any) => {
        // Ajustamos según la estructura que devuelve tu backend
        this.detalle = resp; 
        console.log('Detalle cargado:', this.detalle);
        // PARSEAR EL JSON DINÁMICO
        if (this.detalle.parametros_indexados_values) {
          try {
            // Si viene como string, lo convertimos a objeto
            if (typeof this.detalle.parametros_indexados_values === 'string') {
              this.detalle.metadatos = JSON.parse(this.detalle.parametros_indexados_values);
            } else {
              this.detalle.metadatos = this.detalle.parametros_indexados_values;
            }
          } catch (e) {
            console.error("Error al parsear metadatos", e);
            this.detalle.metadatos = [];
          }
        }
        
        this.cargando = false;
        this.cdr.detectChanges(); // Forzamos la actualización de la vista
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error al traer detalle:', err);
        this.toast.error('No se pudo obtener la información del documento.');
      }
    });
  }



  

  cerrar() {
    this.activeModal.dismiss('cerrado');
  }
}