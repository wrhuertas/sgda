import { Component, EventEmitter, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { AreaService } from '../service/area.service';

@Component({
  selector: 'app-registrar-area',
  templateUrl: './registrar-area.component.html',
  styleUrls: ['./registrar-area.component.scss']
})
export class RegistrarAreaComponent {
  nombre: string = '';
  user: any;
  isLoading: boolean = false;
verTodosTramites: boolean = false;
  @Output() AreaC = new EventEmitter<any>();

  constructor(
    private authService: AuthService,
    public AreaService: AreaService,
    public toast: ToastrService,
    public modal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.user = this.authService.user;
  }

  store() {
    if (!this.user?.id_empresa) {
      this.toast.error('No se encontró la empresa del usuario');
      return;
    }

    const data = {
      nombre: this.nombre,
      id_empresa: this.user.id_empresa,
      ver_todos_tramites: this.verTodosTramites ? 1 : 0 // <-- enviar 1 o 0
    };

    this.isLoading = true;

    this.AreaService.registerArea(data).subscribe({
      next: (resp: any) => {
        this.toast.success('Área creada correctamente');
        this.AreaC.emit(resp.area);
        this.modal.close();
      },
      error: () => {
        this.toast.error('Error al crear el área');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  cerrar() {
    this.modal.close();
  }
}
