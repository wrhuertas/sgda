import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { ToastrService } from 'ngx-toastr'; // o el toast que uses
import { Subseccion1Service } from '../service/subseccion1.service';

@Component({
  selector: 'app-delete-subseccion1',
  templateUrl: './delete-subseccion1.component.html',
  styleUrls: ['./delete-subseccion1.component.scss']
})
export class DeleteSubseccion1Component {

  @Input() SUBSECCION1_SELECTED: any;
  @Output() subseccionEliminada = new EventEmitter<number>();

  isLoading: boolean = false;

  constructor(
    private subseccion1Service: Subseccion1Service,
    private modal: NgbActiveModal,
    private toast: ToastrService
  ) {}

  confirmarEliminar(): void {
    if (!this.SUBSECCION1_SELECTED || !this.SUBSECCION1_SELECTED.id_proyecto) {
      this.toast.error('Error', 'Subsección inválida');
      return;
    }
  
    if (!confirm(`¿Está seguro que desea eliminar la subsección "${this.SUBSECCION1_SELECTED.nombre}"?`)) {
      return;
    }
  
    this.isLoading = true;
  
    this.subseccion1Service.deleteSubseccion(this.SUBSECCION1_SELECTED.id_proyecto)
      .subscribe({
        next: (resp: any) => {
          if (resp.success) {
            this.toast.success('Éxito', resp.message || 'Subsección eliminada correctamente');
            this.subseccionEliminada.emit(this.SUBSECCION1_SELECTED.id_proyecto);
            this.modal.close();
          } else {
            let mensaje = resp.message || 'No se pudo eliminar la subsección';
            if (resp.tieneHijos) mensaje += ' porque tiene subsecciones hijas';
            else if (resp.tieneSeries) mensaje += ' porque tiene series asociadas';
            this.toast.warning('No permitido', mensaje);
            this.isLoading = false;
          }
        },
        error: (err: any) => {
          const mensaje = err?.error?.message || err?.error?.message_text || 'No se pudo eliminar la subsección';
          this.toast.warning('No permitido', mensaje);
          this.isLoading = false;
        },
        complete: () => this.isLoading = false
      });
  }
  

  cancelar(): void {
    this.modal.dismiss();
  }
}
