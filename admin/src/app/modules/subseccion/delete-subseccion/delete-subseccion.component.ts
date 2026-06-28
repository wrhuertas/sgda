import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { SubseccionService } from '../service/subseccion.service';

@Component({
  selector: 'app-delete-subseccion',
  templateUrl: './delete-subseccion.component.html',
  styleUrls: ['./delete-subseccion.component.scss']
})
export class DeleteSubseccionComponent implements OnInit {

  @Input() SUBSECCION_SELECTED: any; 
  @Output() subseccionEliminada: EventEmitter<number> = new EventEmitter();

  isLoading: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    private subseccionService: SubseccionService,
    private toast: ToastrService
  ) {}

  ngOnInit(): void {
    if (!this.SUBSECCION_SELECTED) {
      console.warn('No se recibió la subsección');
      this.modal.dismiss();
    }
  }

  eliminar(): void {
    if (!this.SUBSECCION_SELECTED || !this.SUBSECCION_SELECTED.id_proyecto) {
      this.toast.error('Error', 'Subsección inválida');
      return;
    }
  
    if (!confirm(`¿Está seguro que desea eliminar la subsección "${this.SUBSECCION_SELECTED.nombre}"?`)) {
      return;
    }
  
    this.isLoading = true;
  
    this.subseccionService.deleteSubseccion(this.SUBSECCION_SELECTED.id_proyecto)
      .subscribe({
        next: (resp: any) => {
          // ✅ El backend indica que se eliminó correctamente
          if (resp.success) {
            this.toast.success('Éxito', resp.message || 'Subsección eliminada correctamente');
            this.subseccionEliminada.emit(this.SUBSECCION_SELECTED.id_proyecto);
            this.modal.close();
          } else {
            // 🔴 Esto solo pasa si el backend devuelve success=false (por precaución)
            let mensaje = resp.message || 'No se pudo eliminar la subsección';
  
            // Si quieres, puedes mostrar info extra sobre hijos/series
            if (resp.tieneHijos) {
              mensaje += ' porque tiene subsecciones hijas';
            } else if (resp.tieneSeries) {
              mensaje += ' porque tiene series asociadas';
            }
  
            this.toast.warning('No permitido', mensaje);
            this.isLoading = false;
          }
        },
        error: (err: any) => {
          // 🔴 Captura errores HTTP
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
