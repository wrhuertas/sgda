import { environment } from './../../../../environments/environment';
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';


@Component({
  selector: 'app-ver-documento-sessiones',
  templateUrl: './ver-documento-sessiones.component.html',
  styleUrls: ['./ver-documento-sessiones.component.scss']
})
export class VerDocumentoSessionesComponent implements OnInit {
  @Input() documento: any;

  // URL base para concatenar el path del documento
  URL_BACKEND: string = environment.URL_BACKEND;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    console.log('📦 Documento recibido en el modal:', this.documento);
  }
}
