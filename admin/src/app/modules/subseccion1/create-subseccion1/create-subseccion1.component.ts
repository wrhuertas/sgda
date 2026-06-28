import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subseccion1Service } from '../service/subseccion1.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-create-subseccion1',
  templateUrl: './create-subseccion1.component.html',
  styleUrls: ['./create-subseccion1.component.scss']
})
export class CreateSubseccion1Component {
  @Input() idSubseccion!: number;          // ya existía
  @Input() nombreSubseccion!: string;    
  @Output() SubseccionC = new EventEmitter<any>();
  @Input() proyectoCompleto: any;    // ID actual (18)
@Input() padreId!: number;            // Padre (14)

  nombre: string = '';
   siglas: string = '';
 isLoading: boolean = false;
  constructor(
    public modalService: NgbModal,
    public activeModal: NgbActiveModal,
    private subseccion1Service: Subseccion1Service,
    private toastr: ToastrService 
  ) {}

   ngOnInit(): void {
    if (this.nombreSubseccion) {
      console.log('Nombre SubSección recibido en el modal:', this.nombreSubseccion);
    }
    if (this.proyectoCompleto) {
      console.log("🆔 ID:", this.proyectoCompleto.id);
      console.log("🧩 Padre ID:", this.proyectoCompleto.padre_id);
    }
  }

  guardar() {
    // 🔹 Validación frontend
    if (!this.nombre || this.nombre.trim() === '') {
      this.toastr.warning('El nombre de la Sub Sección 1 es obligatorio.', 'Validación');
      return;
    }
  
    if (!this.idSubseccion || isNaN(this.idSubseccion)) {
      this.toastr.error('ID de la Sub Sección padre inválido.', 'Error');
      console.error('ID de la Sub Sección padre inválido:', this.idSubseccion);
      return;
    }
  
    this.isLoading = true;
  
    const data = {
      nombre: this.nombre,
      siglas: (this.siglas || '').toUpperCase(),
      id_proyecto: this.idSubseccion, // 18
      id_subseccion: this.padreId     // 14
    };
  
    this.subseccion1Service.registerSubseccion1(data).subscribe({
      next: (res: any) => {
        this.toastr.success('Sub Sección 1 creada correctamente', 'Éxito');
        this.SubseccionC.emit(res);
        this.activeModal.close();
      },
  
      error: (err) => {
        console.error('Error al crear SubSeccion1:', err);
  
        // 🔴 ERROR DE VALIDACIÓN LARAVEL (422)
        if (err.status === 422) {
  
          // 🔹 Mostrar mensaje principal
          if (err.error?.message) {
            this.toastr.error(err.error.message, 'Validación');
            return;
          }
  
          // 🔹 Mostrar primer error por campo (por seguridad)
          if (err.error?.errors) {
            const errores = err.error.errors;
            const primerCampo = Object.keys(errores)[0];
            if (primerCampo && errores[primerCampo]?.length) {
              this.toastr.error(errores[primerCampo][0], 'Validación');
            }
            return;
          }
        }
  
        // 🔴 ERROR GENERAL
        this.toastr.error('Ocurrió un error al guardar la Sub Sección 1', 'Error');
      },
  
      complete: () => {
        this.isLoading = false;
      }
    });
  }
  


   cerrar() {
    this.activeModal.dismiss('Cerrado por usuario');
  }

}
