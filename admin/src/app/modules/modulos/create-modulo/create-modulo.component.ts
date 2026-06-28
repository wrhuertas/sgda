import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ModulosService } from '../service/modulos.service';
import { AuthService } from 'src/app/modules/auth'; // Ajusta según ruta real

@Component({
  selector: 'app-create-modulo',
  templateUrl: './create-modulo.component.html',
  styleUrls: ['./create-modulo.component.scss']
})
export class CreateModuloComponent {

  @Output() ModuloC: EventEmitter<any> = new EventEmitter();
  @Input() idProyecto: number | null = null;


  nombre: string = '';
  descripcion: string = '';
  estado: number = 1;

  id_empresa: number | null = null;  // Se asignará dinámicamente

  isLoading: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    public modulosService: ModulosService,
    public toast: ToastrService,
    public authService: AuthService,  // <-- Inyecta AuthService
  ) {}

  ngOnInit(): void {
    // Obtenemos el id_empresa desde el usuario logueado
    const user = this.authService.user;

    if (user) {
      this.id_empresa = user.id_empresa || null;
    }
  }

  store() {
  if (!this.nombre.trim()) {
    this.toast.error("Validación", "El nombre del módulo es requerido");
    return;
  }

  if (!this.idProyecto) {
    this.toast.error("Error", "No se ha recibido el proyecto para asociar el módulo");
    return;
  }

  this.isLoading = true;

  const data = {
    nombre: this.nombre,
    descripcion: this.descripcion,
    estado: this.estado,
    id_proyecto: this.idProyecto  // Solo enviamos id_proyecto
  };

  this.modulosService.registerModulo(data).subscribe({
    next: (resp: any) => {
      this.toast.success("Éxito", "El módulo se registró correctamente");
      this.ModuloC.emit(resp.modulo || resp);
      this.modal.close();
    },
    error: () => {
      this.toast.error("Error", "Ocurrió un problema al crear el módulo");
      this.isLoading = false;
    },
    complete: () => this.isLoading = false
  });
}


}
