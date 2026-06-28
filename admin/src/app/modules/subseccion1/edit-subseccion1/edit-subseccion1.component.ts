import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Subseccion1Service } from '../service/subseccion1.service';

@Component({
  selector: 'app-edit-subseccion1',
  templateUrl: './edit-subseccion1.component.html',
  styleUrls: ['./edit-subseccion1.component.scss']
})
export class EditSubseccion1Component implements OnInit {

  @Input() SUBSECCION1_SELECTED: any; // sub-sub-sección enviada
  @Output() subseccionActualizada: EventEmitter<any> = new EventEmitter();

  nombre: string = '';
  id_empresa: number | null = null;
  sigla: string = '';
  estado: number = 1;
  isLoading: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    private subseccion1Service: Subseccion1Service,
    private toast: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.SUBSECCION1_SELECTED) {
      this.nombre = this.SUBSECCION1_SELECTED.nombre;
      this.id_empresa = this.SUBSECCION1_SELECTED.id_empresa;
      this.sigla = this.SUBSECCION1_SELECTED.sigla;
      this.estado = this.SUBSECCION1_SELECTED.estado ?? 1;
    } else {
      this.toast.error('No se recibió la sub-sub-sección para editar');
      this.modal.dismiss();
    }
  }

  update() {
    // Validaciones
    if (!this.nombre.trim()) {
      this.toast.error('Validación', 'El nombre es requerido');
      return;
    }
  
    if (!this.id_empresa) {
      this.toast.error('Validación', 'Debe seleccionar una empresa');
      return;
    }
  
    this.isLoading = true;
  
    // Datos a enviar
    const data = {
      nombre: this.nombre,
      id_empresa: this.id_empresa,
      sigla: this.sigla,
      estado: this.estado
    };
  
    // 🔹 Usar el ID correcto: probablemente sea id_proyecto
    const idSubsub = this.SUBSECCION1_SELECTED.id_proyecto;
  
    this.subseccion1Service.update(idSubsub, data)
      .subscribe({
        next: (resp: any) => {
          if (resp.success) {
            // Si la actualización fue exitosa
            this.toast.success('Éxito', resp.message || 'Sub-sub-sección actualizada');
            this.subseccionActualizada.emit(resp.proyecto || resp); // Emitir al padre
            this.modal.close();
          } else {
            // Si el backend devuelve un success = false
            this.toast.warning('No permitido', resp.message || 'No se pudo actualizar');
            this.isLoading = false;
          }
        },
        error: (err) => {
          // 🔹 Aquí mostramos mensajes personalizados desde el backend
          if (err.status === 422) {
            // Validación fallida, nombre duplicado
            const msg = err?.error?.message || 'El nombre ya existe';
            this.toast.warning('Validación', msg);
          } else {
            // Otros errores inesperados
            const msg = err?.error?.message || 'Error al actualizar la sub-sub-sección';
            this.toast.error('Error', msg);
          }
          this.isLoading = false;
        },
        complete: () => this.isLoading = false
      });

  }
  
  

  cancelar() {
    this.modal.dismiss();
  }
}
