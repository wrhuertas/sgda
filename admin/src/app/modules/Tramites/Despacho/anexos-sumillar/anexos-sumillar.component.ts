import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { URL_SERVICIOS } from 'src/app/config/config';

@Component({
  selector: 'app-anexos-sumillar',
  templateUrl: './anexos-sumillar.component.html',
  styleUrls: ['./anexos-sumillar.component.scss']
})
export class AnexosSumillarComponent {
  @Input() anexos: any[] = [];
  @Input() id_tramite: number | null = null;

  public sumillaText: string = '';

  constructor(public activeModal: NgbActiveModal) {}

  verAnexo(anexo: any) {
    if (!anexo || !anexo.ruta) return;
    const url = `${URL_SERVICIOS}/storage/${anexo.ruta}`;
    window.open(url, '_blank');
  }

  guardarSumilla() {
    // Devolver la sumilla al componente padre
    this.activeModal.close({ sumilla: this.sumillaText });
  }

  cerrar() {
    this.activeModal.dismiss();
  }

}
