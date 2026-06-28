import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProyectoService } from '../../proyecto/service/proyecto.service';
import { ToastrService } from 'ngx-toastr';
import { SubseccionService } from '../service/subseccion.service';

@Component({
  selector: 'app-create-subseccion',
  templateUrl: './create-subseccion.component.html',
  styleUrls: ['./create-subseccion.component.scss']
})
export class CreateSubseccionComponent {
@Input() proyectoCompleto: any;

  @Input() idProyecto!: number;
  @Output() SubseccionC = new EventEmitter<any>();

  nombre: string = '';
  siglas: string = '';
  isLoading: boolean = false;

  usuarioActual: any = null; // Usuario cargado desde localStorage

  constructor(
    public modalService: NgbModal,
    public proyectoService: ProyectoService,
    private subseccionService: SubseccionService,
    private router: Router,
    public toast: ToastrService,
  ) { }

  ngOnInit(): void {
    // Cargar usuario desde localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        this.usuarioActual = JSON.parse(userData);
        console.log('✅ Usuario cargado:', this.usuarioActual);
      } catch (error) {
        console.error('❌ Error al parsear el usuario de localStorage:', error);
      }
    } else {
      console.warn('⚠️ No hay usuario guardado en localStorage.');
    }

    console.log('ID del proyecto recibido en el modal:', this.idProyecto);

    
  }

  guardarSubseccion() {
    // Validación de nombre
    if (!this.nombre || this.nombre.trim() === '') {
      this.toast.error('Debes ingresar un nombre para la subsección');
      return;
    }

    // Validación de proyecto
    if (!this.idProyecto) {
      this.toast.error('No se encontró el proyecto seleccionado');
      return;
    }

    // Validación de usuario
    if (!this.usuarioActual?.id_empresa) {
      this.toast.error('No se pudo determinar la empresa del usuario');
      return;
    }

    this.isLoading = true;

    // Crear objeto para enviar al backend
    const nuevaSubseccion = { 
      idProyecto: this.idProyecto,
      nombre: this.nombre,
      siglas: (this.siglas || '').toUpperCase(),
      id_empresa: this.usuarioActual.id_empresa
    };

    // Llamada al servicio
    this.subseccionService.registerSubseccion(nuevaSubseccion).subscribe({
      next: (resp: any) => {
        this.toast.success('Subsección creada correctamente');
        this.SubseccionC.emit(resp); // Emitir al componente padre
        this.cerrar(); // Cerrar modal automáticamente
      },
      error: (err) => {
        console.error("Error al registrar subsección", err);
      
        if (err.status === 422) {
          this.toast.error(
            err.error?.message || 'Error de validación',
            'Validación'
          );
          return;
        }
      
        this.toast.error("Error al registrar subsección", "Error");
      },
      
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  cerrar() {
    this.modalService.dismissAll();
  }

}
