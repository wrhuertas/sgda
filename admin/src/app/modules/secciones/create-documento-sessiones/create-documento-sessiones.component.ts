import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { SeccionesService } from '../service/sessiones.service';
import { AuthService } from '../../auth';


@Component({
  selector: 'app-create-documento-sessiones',
  templateUrl: './create-documento-sessiones.component.html',
  styleUrls: ['./create-documento-sessiones.component.scss']
})
export class CreateDocumentoSessionesComponent {

  @Input() idSeccion!: number;
  @Input() idModulo!: number;
  @Output() DocumentoCreado = new EventEmitter<any>();

  tipologia: string = '';
  tema: string = '';
  id_estanteria: number | null = null;
  id_caja: number | null = null;
  fecha: string = '';
  archivosSeleccionados: File[] = [];

  estanterias = [
    { id: 1, nombre: 'Estantería A' },
    { id: 2, nombre: 'Estantería B' },
    { id: 3, nombre: 'Estantería C' }
  ];

  cajas = [
    { id: 1, nombre: 'Caja 1' },
    { id: 2, nombre: 'Caja 2' },
    { id: 3, nombre: 'Caja 3' }
  ];

  constructor(
    public activeModal: NgbActiveModal,
    private toast: ToastrService,
    private seccionesService: SeccionesService,
    private auth: AuthService
  ) {}

  close() {
    this.activeModal.close();
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.archivosSeleccionados = Array.from(event.target.files);
      console.log('Archivos seleccionados:', this.archivosSeleccionados);
    }
  }

  store() {
    if (!this.tipologia || !this.tema || !this.id_estanteria || !this.id_caja) {
      this.toast.error("Todos los campos son obligatorios", "Validación");
      return;
    }

    if (this.archivosSeleccionados.length === 0) {
      this.toast.error("Debes seleccionar al menos un documento", "Validación");
      return;
    }

    const formData = new FormData();
    formData.append("tipologia", this.tipologia);
    formData.append("tema", this.tema);
    formData.append("id_estanteria", this.id_estanteria!.toString());
    formData.append("id_caja", this.id_caja!.toString());
    formData.append("id_seccion", this.idSeccion.toString());
    formData.append("id_modulo", this.idModulo.toString());

    if (this.fecha) {
      formData.append("fecha", this.fecha);
    }

    this.archivosSeleccionados.forEach((file) => {
      formData.append("archivos[]", file);
    });

    this.seccionesService.registrarDocumento(formData).subscribe({
  next: (resp: any) => {
    if (resp.errores && resp.errores.length > 0) {
      resp.errores.forEach((msg: string) => {
        this.toast.error(msg, "OCR no aplicado");
      });
    }

    this.toast.success("Documento registrado correctamente", "Éxito");
    this.DocumentoCreado.emit(resp.documento || resp);
    this.activeModal.close();
  },
  error: (err) => {
    console.error("Error al registrar documento", err);
  
    // 🔴 Error de validación Laravel
    if (err.status === 422) {
  
      // Mostrar mensaje general
      if (err.error?.message) {
        this.toast.error(err.error.message, "Validación");
      }
  
      // Mostrar errores por campo (opcional)
      if (err.error?.errors) {
        Object.keys(err.error.errors).forEach((campo) => {
          err.error.errors[campo].forEach((msg: string) => {
            this.toast.error(msg, "Validación");
          });
        });
      }
  
      return;
    }
    
  
    // 🔴 Otro tipo de error
    this.toast.error("Error al registrar documento", "Error");
  }
  
});

  }
}
