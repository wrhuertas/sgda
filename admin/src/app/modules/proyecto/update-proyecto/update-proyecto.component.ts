import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ProyectoService } from '../../proyecto/service/proyecto.service';

@Component({
  selector: 'app-update-proyecto',
  templateUrl: './update-proyecto.component.html',
  styleUrls: ['./update-proyecto.component.scss']
})
export class UpdateProyectoComponent {

  @Output() ProyectoE: EventEmitter<any> = new EventEmitter();
  @Input() PROYECTO_SELECTED: any;

  nombre: string = '';
  siglas: string = '';
  id_empresa: number | null = null;
  estado: number = 1;

  isLoading: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    private proyectosService: ProyectoService,
    private toast: ToastrService,
  ) {}

  ngOnInit(): void {
    if (this.PROYECTO_SELECTED) {
      this.nombre = this.PROYECTO_SELECTED.nombre;
      this.siglas = this.PROYECTO_SELECTED.sigla || this.PROYECTO_SELECTED.siglas || '';
      this.id_empresa = this.PROYECTO_SELECTED.id_empresa;
      this.estado = this.PROYECTO_SELECTED.estado ?? 1;

      console.log('Proyecto seleccionado:', this.PROYECTO_SELECTED);
    console.log('id_empresa:', this.id_empresa);
    }
  }

  update() {
    // Validaciones básicas frontend
    if (!this.nombre || !this.nombre.trim()) {
      this.toast.error('El nombre es requerido', 'Validación');
      return;
    }
  
    if (!this.id_empresa) {
      this.toast.error('Debe seleccionar una empresa', 'Validación');
      return;
    }
  
    this.isLoading = true;
    // Forzar mayúsculas en siglas
    this.siglas = (this.siglas || '').toUpperCase();
  
    const data = new FormData();
    data.append('nombre', this.nombre.trim());
    if (this.siglas) data.append('siglas', this.siglas);
    data.append('id_empresa', this.id_empresa.toString());
    data.append('estado', this.estado.toString());
    data.append('_method', 'PUT');
  
    const proyectoId = this.PROYECTO_SELECTED.id;
  
    this.proyectosService.updateProyecto(proyectoId, data).subscribe({
      next: (resp: any) => {
        this.toast.success('Proyecto actualizado correctamente', 'Éxito');
        this.ProyectoE.emit(resp.proyecto);
        this.modal.close();
      },
  
      error: (err: any) => {
        this.isLoading = false;
  
        // 🔴 VALIDACIÓN DE NOMBRE DUPLICADO (backend)
        if (err.status === 422) {
          this.toast.warning(
            err.error?.message || 'Ya existe un proyecto con este nombre',
            'Validación'
          );
          return;
        }
  
        // ⚠️ OTRO ERROR
        this.toast.error(
          err.error?.message || 'No se pudo actualizar el proyecto',
          'Error'
        );
      },
  
      complete: () => {
        this.isLoading = false;
      }
    });
  }
  

}
