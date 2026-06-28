import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { SubseccionService } from '../service/subseccion.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-edit-subseccion',
  templateUrl: './edit-subseccion.component.html',
  styleUrls: ['./edit-subseccion.component.scss']
})
export class EditSubseccionComponent implements OnInit {

  @Input() SUBSECCIONES_SELECTED: any;
  @Output() ProyectoE: EventEmitter<any> = new EventEmitter();

  nombre: string = '';
  siglas: string = '';
  id_empresa: number | null = null;
  estado: number = 1;

  isLoading: boolean = false;

  constructor(
    private subseccionService: SubseccionService,
    public modal: NgbActiveModal,
    private toast: ToastrService
  ) {}

  ngOnInit(): void {
    if (!this.SUBSECCIONES_SELECTED) {
      console.warn('No se recibió subsección en el modal');
      return;
    }

    // 👇 CARGA CORRECTA DE DATOS
    this.nombre = this.SUBSECCIONES_SELECTED.nombre;
    this.siglas = this.SUBSECCIONES_SELECTED.sigla || this.SUBSECCIONES_SELECTED.siglas || '';
    this.id_empresa = this.SUBSECCIONES_SELECTED.id_empresa;
    this.estado = this.SUBSECCIONES_SELECTED.estado ?? 1;

    console.log('Subsección cargada:', this.SUBSECCIONES_SELECTED);
  }

  update(): void {

    if (!this.nombre.trim()) {
      this.toast.error('Validación', 'El nombre es requerido');
      return;
    }

    if (!this.id_empresa) {
      this.toast.error('Validación', 'Debe seleccionar una empresa');
      return;
    }

    this.isLoading = true;

    const data = new FormData();
    data.append('nombre', this.nombre);
    if (this.siglas) data.append('siglas', (this.siglas || '').toUpperCase());
    data.append('id_empresa', this.id_empresa.toString());
    data.append('estado', this.estado.toString());
    data.append('_method', 'PUT');

    // 🔴 ID CORRECTO
    const proyectoId = this.SUBSECCIONES_SELECTED.id_proyecto;

    console.log('Actualizando subsección ID:', proyectoId);

    this.subseccionService.updateProyecto(proyectoId, data).subscribe({
      next: (resp: any) => {
        this.toast.success('Éxito', 'Subsección actualizada correctamente');
        this.ProyectoE.emit(resp.proyecto);
        this.modal.close();
      },
      error: (err: any) => {
        const msg = err?.error?.message ?? 'No se pudo actualizar la subsección';
        this.toast.error('Error', msg);
        this.isLoading = false;
      },
      complete: () => this.isLoading = false
    });
  }
}
