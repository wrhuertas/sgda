import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TipodocumentoService } from '../service/tipodocumento.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-editar-documento',
  templateUrl: './editar-documento.component.html'
})
export class EditarDocumentoComponent implements OnInit {
  
  @Input() TIPODOCUMENTO_SELECTED: any; // Recibe el objeto desde la lista
  @Output() ClienteE: EventEmitter<any> = new EventEmitter(); // Emisor para refrescar la tabla

  nombre: string = '';
  prioridadId: string = '';
  isLoading: boolean = false;
  estado: number = 1;

  constructor(
    public modal: NgbActiveModal,
    private tipoDocumentoService: TipodocumentoService,
    private toast: ToastrService
  ) { }

  ngOnInit(): void {
    // Seteamos los valores iniciales para que aparezcan en el modal
    if (this.TIPODOCUMENTO_SELECTED) {
      this.nombre = this.TIPODOCUMENTO_SELECTED.nombre;
      this.prioridadId = this.TIPODOCUMENTO_SELECTED.prioridad;
      this.estado = this.TIPODOCUMENTO_SELECTED.estado;
    }
  }

  update() {
    if (!this.nombre || !this.prioridadId) {
      this.toast.error('Todos los campos son obligatorios');
      return;
    }
  
    this.isLoading = true;
    
    // Objeto JSON simple
    const data = {
      nombre: this.nombre,
      prioridad: this.prioridadId,
      id_empresa: this.TIPODOCUMENTO_SELECTED.id_empresa,
      estado: this.estado
      
    };
  
    this.tipoDocumentoService.updateTipoDocumento(this.TIPODOCUMENTO_SELECTED.id_tipodocumento, data).subscribe({
      next: (resp: any) => {
        this.isLoading = false;
        this.ClienteE.emit(resp);
        this.toast.success('Documento actualizado correctamente');
        this.modal.close();
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
        this.toast.error('Error al actualizar');
      }
    });
  }

  cerrar() {
    this.modal.dismiss();
  }
}