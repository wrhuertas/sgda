import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ProyectoService } from '../../proyecto/service/proyecto.service';

@Component({
  selector: 'app-delete-proyecto',
  templateUrl: './delete-proyecto.component.html',
  styleUrls: ['./delete-proyecto.component.scss']
})
export class DeleteProyectoComponent {

  @Output() ProyectoD: EventEmitter<any> = new EventEmitter();
  @Input() PROYECTO_SELECTED: any;

  isLoading: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    private proyectosService: ProyectoService,
    private toast: ToastrService
  ) {}

  ngOnInit(): void {}

  delete() {
    if (!this.PROYECTO_SELECTED || !this.PROYECTO_SELECTED.id) {
      this.toast.error('Error', 'No se ha seleccionado un proyecto válido');
      return;
    }
  
    this.isLoading = true;
  
    this.proyectosService.deleteProyecto(this.PROYECTO_SELECTED.id).subscribe({
      next: () => {
        this.toast.success('Éxito', 'El proyecto se eliminó correctamente');
        this.ProyectoD.emit(this.PROYECTO_SELECTED.id);
        this.modal.close();
      },
      error: (error) => {
        // 👇 Mensaje enviado desde Laravel
        if (error?.error?.message_text) {
          this.toast.warning('No permitido', error.error.message_text);
        } else {
          this.toast.error('Error', 'No se pudo eliminar el proyecto');
        }
  
        this.isLoading = false;
      },
      complete: () => this.isLoading = false
    });
  }
  
}
