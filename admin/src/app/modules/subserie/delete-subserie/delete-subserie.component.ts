import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SubserieService } from '../service/subserie.service';

@Component({
  selector: 'app-delete-subserie',
  templateUrl: './delete-subserie.component.html',
  styleUrls: ['./delete-subserie.component.scss']
})
export class DeleteSubserieComponent {


  @Input() SERIE_SELECTED: any;
  @Output() SerieEliminada = new EventEmitter<void>();

  isLoading = false;

  constructor(
    private seriesubService: SubserieService,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit() {
    console.log("Modal abierto, serie seleccionada:", this.SERIE_SELECTED);
    console.log("ID de la serie:", this.SERIE_SELECTED?.id_serie); // ✅ CORRECTO
  }
  
  confirmarEliminar() {
    console.log("Intentando eliminar serie con ID:", this.SERIE_SELECTED?.id_serie); // ✅
  
    this.isLoading = true;
  
    this.seriesubService.EliminarSubSerie(this.SERIE_SELECTED.id_serie).subscribe({ // ✅
      next: () => {
        console.log("Serie eliminada correctamente:", this.SERIE_SELECTED.id_serie); // ✅
        this.SerieEliminada.emit();  
        this.activeModal.close();    
      },
      error: (err) => {
        console.error("Error al eliminar serie", err);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
  
  cancelar() {
    this.activeModal.dismiss();
  }

}
