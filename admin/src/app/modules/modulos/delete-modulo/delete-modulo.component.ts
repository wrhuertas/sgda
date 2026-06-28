import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ModulosService } from '../service/modulos.service';

@Component({
  selector: 'app-delete-modulo',
  templateUrl: './delete-modulo.component.html',
  styleUrls: ['./delete-modulo.component.scss']
})
export class DeleteModuloComponent {

  @Output() ModuloD: EventEmitter<any> = new EventEmitter();
  @Input() MODULO_SELECTED: any;

  isLoading: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    private modulosService: ModulosService,
    private toast: ToastrService,
  ) {}

  ngOnInit(): void {}

  delete() {
    if (!this.MODULO_SELECTED || !this.MODULO_SELECTED.id) {
      this.toast.error('Error', 'No se ha seleccionado un módulo válido');
      return;
    }
    this.isLoading = true;
    this.modulosService.deleteModulo(this.MODULO_SELECTED.id).subscribe({
      next: (resp: any) => {
        this.toast.success('Éxito', 'El módulo se eliminó correctamente');
        this.ModuloD.emit(this.MODULO_SELECTED.id);
        this.modal.close();
      },
      error: (err) => {
        this.toast.error('Error', 'No se pudo eliminar el módulo');
        this.isLoading = false;
      },
      complete: () => this.isLoading = false,
    });
  }
}
