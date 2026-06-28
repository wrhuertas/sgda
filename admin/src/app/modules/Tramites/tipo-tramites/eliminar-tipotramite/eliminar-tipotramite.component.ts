import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TipotramitesService } from '../service/tipotramites.service';

@Component({
  selector: 'app-eliminar-tipotramite',
  templateUrl: './eliminar-tipotramite.component.html',
  styleUrls: ['./eliminar-tipotramite.component.scss']
})
export class EliminarTipotramiteComponent {
  @Output() TipotramitesD: EventEmitter<any> = new EventEmitter();
  @Input() TIPOTRAMITE_SELECTED: any;

  isLoading: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    public TipotramiteService: TipotramitesService,
    public toast: ToastrService,
  ) {}

  delete() {
    if (!this.TIPOTRAMITE_SELECTED?.id_tipo_tramite) {
      this.toast.error('No se pudo identificar el registro');
      return;
    }

    this.isLoading = true;
    (this.TipotramiteService as any).deleteTipotramite(Number(this.TIPOTRAMITE_SELECTED.id_tipo_tramite)).subscribe({
      next: (resp: any) => {
        this.toast.success('Éxito', 'Tipo de trámite eliminado correctamente');
        this.TipotramitesD.emit(resp?.message || true);
        this.modal.close();
      },
      error: () => {
        this.toast.error('Error al eliminar el Tipo Trámite');
        this.isLoading = false;
      }
    });
  }

  cerrar() {
    this.modal.close();
  }
}
