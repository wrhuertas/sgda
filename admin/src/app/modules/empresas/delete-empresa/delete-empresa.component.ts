import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { EmpresaService } from '../service/empresa.service';

@Component({
  selector: 'app-delete-empresa',
  templateUrl: './delete-empresa.component.html',
  styleUrls: ['./delete-empresa.component.scss']
})
export class DeleteEmpresaComponent {

  @Output() EmpresaD: EventEmitter<any> = new EventEmitter();
  @Input() EMPRESA_SELECTED: any;

  isLoading: any;

  constructor(
    public modal: NgbActiveModal,
    public empresaService: EmpresaService,
    public toast: ToastrService,
  ) { }

  ngOnInit(): void {
  }

  delete() {
    this.empresaService.deleteEmpresa(this.EMPRESA_SELECTED.id).subscribe((resp: any) => {
      console.log(resp);
      if (resp.message == 403) {
        this.toast.error("Validación", resp.message_text);
      } else {
        this.toast.success("Éxito", "La empresa se eliminó correctamente");
        this.EmpresaD.emit(resp.message);
        this.modal.close();
      }
    });
  }

}
