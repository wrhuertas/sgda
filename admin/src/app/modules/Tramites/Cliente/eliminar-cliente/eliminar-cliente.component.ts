import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ClienteService } from '../service/cliente.service';

@Component({
  selector: 'app-eliminar-cliente',
  templateUrl: './eliminar-cliente.component.html',
  styleUrls: ['./eliminar-cliente.component.scss']
})
export class EliminarClienteComponent {
  
  @Input() Cliente_SELECTED: any;
  @Output() ClienteD: EventEmitter<void> = new EventEmitter();

  isLoading: boolean = false;

  constructor(
    public activeModal: NgbActiveModal,
    private clienteService: ClienteService
  ) {}

  eliminarCliente() {
    this.isLoading = true;

    this.clienteService.deleteCliente(this.Cliente_SELECTED.id_cliente)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.ClienteD.emit();       // Emitimos al padre
          this.activeModal.close();   // Cerramos modal
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error al eliminar cliente', err);
        }
      });
  }

  cancelar() {
    this.activeModal.dismiss();
  }
}
