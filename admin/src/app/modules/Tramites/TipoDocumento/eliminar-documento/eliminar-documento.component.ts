import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TipodocumentoService } from '../service/tipodocumento.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-eliminar-documento',
  templateUrl: './eliminar-documento.component.html'
})
export class EliminarDocumentoComponent implements OnInit {

  @Input() TIPODOCUMENTO_SELECTED: any;
  @Output() TipoDocumentoD: EventEmitter<any> = new EventEmitter();

  isLoading: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    private tipoDocumentoService: TipodocumentoService,
    private toast: ToastrService
  ) { }

  ngOnInit(): void {}

  eliminar() {
    this.isLoading = true;
    this.tipoDocumentoService.deleteTipoDocumento(this.TIPODOCUMENTO_SELECTED.id_tipodocumento).subscribe({
      next: () => {
        this.isLoading = false;
        this.TipoDocumentoD.emit(); // Notifica al padre para quitarlo de la lista
        this.toast.success('Tipo de Documento eliminado');
        this.modal.close();
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error('No se pudo eliminar el registro');
      }
    });
  }
}