import { Component, EventEmitter, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { TipotramitesService } from '../service/tipotramites.service';

@Component({
  selector: 'app-crear-tipotramite',
  templateUrl: './crear-tipotramite.component.html',
  styleUrls: ['./crear-tipotramite.component.scss']
})
export class CrearTipotramiteComponent {

  nombre: string = '';
  tiempo_tramite: string = '';
  user: any;
  isLoading: boolean = false;
  verTodosTramites: boolean = false;
  @Output() TipotramitesC = new EventEmitter<any>();

  constructor(
    private authService: AuthService,
    public TipotramiteService: TipotramitesService,
    public toast: ToastrService,
    public modal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.user = this.authService.user;
  }

  registrarTramite() {
    if (!this.user?.id_empresa) {
      this.toast.error('No se encontró la empresa del usuario');
      return;
    }

    if (!this.nombre || !this.nombre.trim()) {
      this.toast.error('Validación', 'El nombre del tipo de trámite es requerido');
      return;
    }

    const tiempo = String(this.tiempo_tramite || '').trim();
    if (tiempo && !/^\d+$/.test(tiempo)) {
      this.toast.error('Validación', 'El tiempo del trámite debe ser numérico');
      return;
    }
  
    const data = {
      nombre: this.nombre.trim(),
      tiempo_tramite: tiempo ? Number(tiempo) : null,
      id_empresa: this.user.id_empresa,
      id_usuario: this.user.id // <--- Agregamos el ID del usuario
    };
  
    this.isLoading = true;
  
    this.TipotramiteService.registerTipotramite(data).subscribe({
      next: (resp: any) => {
        this.toast.success('Tipo Trámite creado correctamente');
        // Asegúrate de que el emit use el nombre correcto del objeto que devuelve tu API
        this.TipotramitesC.emit(resp.tipotramite); 
        this.modal.close();
      },
      error: (err: any) => {
        if (err?.status === 422 && err?.error?.errors) {
          const messages = Object.values(err.error.errors).flat().join(' | ');
          this.toast.error(messages || 'Validación fallida');
        } else {
          this.toast.error('Error al crear el Tipo Trámite');
        }
        this.isLoading = false;
      }
    });
  }

  cerrar() {
    this.modal.close();
  }

}
