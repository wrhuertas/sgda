import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { TipotramitesService } from '../service/tipotramites.service';

@Component({
  selector: 'app-editar-tipotramite',
  templateUrl: './editar-tipotramite.component.html',
  styleUrls: ['./editar-tipotramite.component.scss']
})
export class EditarTipotramiteComponent {
  @Output() TipotramitesE: EventEmitter<any> = new EventEmitter();
  @Input() TIPOTRAMITE_SELECTED: any;

  nombre: string = '';
  tiempo_tramite: string = '';
  estado: number = 1;
  isLoading: boolean = false;
  user: any;

  constructor(
    public modal: NgbActiveModal,
    private authService: AuthService,
    public TipotramiteService: TipotramitesService,
    public toast: ToastrService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.user || JSON.parse(localStorage.getItem('user') || '{}');
    if (this.TIPOTRAMITE_SELECTED) {
      this.nombre = this.TIPOTRAMITE_SELECTED.nombre || '';
      this.tiempo_tramite = this.TIPOTRAMITE_SELECTED.tiempo_tramite != null ? String(this.TIPOTRAMITE_SELECTED.tiempo_tramite) : '';
      this.estado = this.TIPOTRAMITE_SELECTED.estado != null ? Number(this.TIPOTRAMITE_SELECTED.estado) : 1;
    }
  }

  store() {
    if (!this.nombre || !this.nombre.trim()) {
      this.toast.error('Validación', 'El nombre del tipo de trámite es requerido');
      return;
    }

    const tiempo = String(this.tiempo_tramite || '').trim();
    if (tiempo && !/^\d+$/.test(tiempo)) {
      this.toast.error('Validación', 'El tiempo del trámite debe ser numérico');
      return;
    }

    if (!this.user?.id) {
      this.toast.error('Sesión inválida');
      return;
    }

    const data = {
      nombre: this.nombre.trim(),
      tiempo_tramite: tiempo ? Number(tiempo) : null,
      estado: Number(this.estado),
      id_usuario: this.user.id,
    };

    this.isLoading = true;
    this.TipotramiteService.updateTipotramite(Number(this.TIPOTRAMITE_SELECTED.id_tipo_tramite), data).subscribe({
      next: (resp: any) => {
        this.toast.success('Éxito', 'Tipo de trámite actualizado correctamente');
        this.TipotramitesE.emit(resp.tipotramite);
        this.modal.close();
      },
      error: (err) => {
        if (err?.status === 422 && err?.error?.errors) {
          const messages = Object.values(err.error.errors).flat().join(' | ');
          this.toast.error(messages || 'Validación fallida');
        } else {
          this.toast.error('Error al actualizar el Tipo Trámite');
        }
        this.isLoading = false;
      }
    });
  }

  cerrar() {
    this.modal.close();
  }
}
