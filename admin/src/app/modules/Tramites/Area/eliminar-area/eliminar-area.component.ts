import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AreaService } from '../service/area.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-eliminar-area',
  templateUrl: './eliminar-area.component.html',
  styleUrls: ['./eliminar-area.component.scss']
})
export class EliminarAreaComponent {

  @Input() AREA_SELECTED: any; // Área que vamos a “eliminar”
  @Output() AreaD = new EventEmitter<any>(); // Emitir al componente padre cuando se elimine

  isLoading: boolean = false;

  constructor(
    public areaService: AreaService,
    public toast: ToastrService,
    public modal: NgbActiveModal
  ) {}

  // Confirmar “eliminación”
 confirmDelete() {
  if (!this.AREA_SELECTED) return;

  this.isLoading = true;

  this.areaService.deleteArea(this.AREA_SELECTED.id_area).subscribe({
    next: (resp: any) => {
      this.toast.success('Área eliminada correctamente');
      this.AreaD.emit(resp.area); // Emitimos el área actualizada con estado = 2
      this.modal.close();
    },
    error: (err) => {
      // ✅ Mostramos SOLO el mensaje que viene del backend
      const mensaje = err?.error?.message; // aquí debería estar tu texto exacto
      if (mensaje) {
        Swal.fire({
          icon: 'error',
          title: 'No se puede eliminar',
          text: mensaje,
          confirmButtonText: 'Aceptar'
        });
      } else {
        // opcional: por si hay otro tipo de error que no tenga mensaje
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al eliminar el área.',
          confirmButtonText: 'Aceptar'
        });
      }
      this.isLoading = false;
    },
    complete: () => {
      this.isLoading = false;
    }
  });
}


  cerrar() {
    this.modal.close();
  }
}
