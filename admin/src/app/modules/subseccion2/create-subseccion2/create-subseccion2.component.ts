import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';

import { Subseccion2Service } from '../service/subseccion2.service';

@Component({
  selector: 'app-create-subseccion2',
  templateUrl: './create-subseccion2.component.html',
  styleUrls: ['./create-subseccion2.component.scss']
})
export class CreateSubseccion2Component {
  @Input() idSubseccion!: number;          // ya existía
  @Input() nombreSubseccion!: string;    
  @Output() SubseccionC = new EventEmitter<any>();

  nombre: string = '';
 isLoading: boolean = false;
  constructor(
    public modalService: NgbModal,
    public activeModal: NgbActiveModal,
    private Subseccion2Service: Subseccion2Service,
    private toastr: ToastrService 
  ) {}

   ngOnInit(): void {
    if (this.nombreSubseccion) {
      console.log('Nombre SubSección recibido en el modal:', this.nombreSubseccion);
    }
  }

  guardar() {
  // Validación del nombre de la SubSección1
  if (!this.nombre || this.nombre.trim() === '') {
    this.toastr.warning('El nombre de la Sub Sección 1 es obligatorio.', 'Validación');
    return;
  }

  // Validación del ID del padre
  if (!this.idSubseccion || isNaN(this.idSubseccion)) {
    this.toastr.error('ID de la Sub Sección padre inválido.', 'Error');
    console.error('ID de la Sub Sección padre inválido:', this.idSubseccion);
    return;
  }

  this.isLoading = true;

  const data = {
    nombre: this.nombre,            
    idSubseccion: this.idSubseccion 
  };

  console.log('Datos que se enviarán al backend:', data); // <-- Para verificar

  this.Subseccion2Service.registerSubseccion2(data).subscribe(
    res => {
      this.toastr.success('Sub Sección 1 creada correctamente', 'Éxito');
      this.SubseccionC.emit(res);
      this.activeModal.close();
      this.isLoading = false;
    },
    err => {
      this.toastr.error('Ocurrió un error al guardar la Sub Sección 1', 'Error');
      console.error('Error al crear SubSeccion1:', err);
      this.isLoading = false;
    }
  );
}


   cerrar() {
    this.modalService.dismissAll();
  }

}
