import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AreaService } from '../service/area.service';

@Component({
  selector: 'app-editar-area',
  templateUrl: './editar-area.component.html',
  styleUrls: ['./editar-area.component.scss']
})
export class EditarAreaComponent implements OnInit {

  @Input() AREA_SELECTED: any;          // Área que recibimos para editar
  @Output() AreaE = new EventEmitter<any>(); // Emitir cambios al padre

  nombre: string = '';
  verTodosTramites: boolean = false;
  estado: number = 1; // 1 = activo, 0 = inactivo
  isLoading: boolean = false;

  constructor(
    public AreaService: AreaService,
    public toast: ToastrService,
    public modal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    if (this.AREA_SELECTED) {
      this.nombre = this.AREA_SELECTED.nombre;
      this.verTodosTramites = this.AREA_SELECTED.ver_todos_tramites === 1;
      this.estado = this.AREA_SELECTED.estado; // Carga el estado actual
    }
  }

  update() {
    if (!this.nombre) {
      this.toast.warning('El nombre del área es obligatorio');
      return;
    }

    const data = {
      nombre: this.nombre,
      ver_todos_tramites: this.verTodosTramites ? 1 : 0,
      estado: this.estado
    };

    this.isLoading = true;

    this.AreaService.updateArea(this.AREA_SELECTED.id_area, data).subscribe({
      next: (resp: any) => {
        this.toast.success('Área actualizada correctamente');
        this.AreaE.emit(resp.area); // Emitimos al componente padre
        this.modal.close();
      },
      error: (err) => {
        this.toast.error('Error al actualizar el área');
        console.error(err);
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
