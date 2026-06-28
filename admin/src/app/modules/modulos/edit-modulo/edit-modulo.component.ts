import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ModulosService } from '../service/modulos.service';

@Component({
  selector: 'app-edit-modulo',
  templateUrl: './edit-modulo.component.html',
  styleUrls: ['./edit-modulo.component.scss']
})
export class EditModuloComponent {

  @Output() ModuloE: EventEmitter<any> = new EventEmitter();
  @Input() MODULO_SELECTED: any;

  nombre: string = '';
  descripcion: string | null = '';
  estado: number = 1;
idProyecto: number = 0;

  isLoading: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    private modulosService: ModulosService,
    private toast: ToastrService,
  ) {}

  ngOnInit(): void {
    if (this.MODULO_SELECTED) {
      this.nombre = this.MODULO_SELECTED.nombre;
      this.descripcion = this.MODULO_SELECTED.descripcion;
      this.estado = this.MODULO_SELECTED.estado ?? 1;
      this.idProyecto = this.MODULO_SELECTED.id_proyecto;
    }
  }

  update() {
  if (!this.nombre.trim()) {
    this.toast.error("Validación", "El nombre es requerido");
    return;
  }

  if (!this.idProyecto || this.idProyecto <= 0) {
    this.toast.error("Validación", "ID del proyecto no válido");
    return;
  }

  this.isLoading = true;

  const data = new FormData();
  data.append('nombre', this.nombre);
  data.append('descripcion', this.descripcion || '');
  data.append('estado', this.estado.toString());
  data.append('id_proyecto', this.idProyecto.toString());  // <-- validado
  data.append('_method', 'PUT');

  console.log('ID Proyecto enviado:', this.idProyecto); // <-- para depuración

  this.modulosService.updateModulo(this.MODULO_SELECTED.id, data).subscribe({
    next: (resp: any) => {
      this.toast.success("Éxito", "Módulo actualizado correctamente");
      this.ModuloE.emit(resp.modulo);
      this.modal.close();
    },
    error: (err: any) => {
      this.toast.error("Error", "No se pudo actualizar el módulo");
      this.isLoading = false;
    },
    complete: () => this.isLoading = false,
  });
}

}
