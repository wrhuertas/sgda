import { TranslationService } from './../../../../../../modules/i18n/translation.service';
import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-firma',
  templateUrl: './firma.component.html',
  styleUrls: ['./firma.component.scss']
})
export class FirmaComponent implements OnInit {
  
  // Para comunicar al componente padre que la firma se actualizó
  @Output() FirmaC: EventEmitter<any> = new EventEmitter();

  usuario_actual: any; 
  id_empresa: any;
  usuario_id: any;
  
  // Vinculados a ngModel en el HTML
  password_firma: string = '';
  fecha_expiracion: string = '';
  
  archivoFirma: File | null = null;
  isLoading: boolean = false;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private translationService: TranslationService,
  ) { }

  ngOnInit(): void {
    // Intentamos obtener el usuario desde localStorage si no fue pasado por componentInstance
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    this.usuario_actual = user;
    this.id_empresa = user.id_empresa;
    this.usuario_id = user.id ?? null;

    console.log('--- DATOS CARGADOS ---');
    console.log('User ID:', this.usuario_id);
    console.log('Empresa ID:', this.id_empresa);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoFirma = file;
      console.log('Archivo seleccionado:', file.name);
    }
  }

  guardarFirma() {
    // Validaciones preventivas usando Swal
    if (!this.id_empresa) {
      Swal.fire('Error', 'No se encontró la empresa del usuario logueado', 'error');
      return;
    }

    if (!this.password_firma || !this.fecha_expiracion) {
      Swal.fire('Atención', 'Por favor complete la contraseña y la fecha de expiración', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('usuario_id', this.usuario_id);
    formData.append('id_empresa', this.id_empresa);
    formData.append('password_firma', this.password_firma);
    formData.append('fecha_expiracion_firma', this.fecha_expiracion);
    
    if (this.archivoFirma) {
      formData.append('archivo_firma', this.archivoFirma);
    }

    // Monitor en consola de lo que se enviará
    console.log('--- ENVIANDO DATOS ---');
    formData.forEach((value, key) => console.log(`${key}:`, value));

    this.isLoading = true;

    this.translationService.registerFirma(formData).subscribe({
      next: (resp: any) => {
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Firma actualizada correctamente',
          timer: 2000,
          showConfirmButton: false
        });
        
        this.FirmaC.emit(resp.user); 
        this.activeModal.close(); // Cerramos el modal
      },
      error: (err: any) => {
        console.error('Error en la petición:', err);
        this.isLoading = false;
        
        const errorMessage = err.error?.message || 'Hubo un error al procesar la firma electrónica';
        Swal.fire('Error', errorMessage, 'error');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}