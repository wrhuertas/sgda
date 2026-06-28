import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-ver-tramite',
  templateUrl: './ver-tramite.component.html',
  styleUrls: ['./ver-tramite.component.scss']
})
export class VerTramiteComponent implements OnInit {

  // Definimos los Inputs con los mismos nombres que usaste en el modalRef
  @Input() id_usuario: any;
  @Input() id_empresa: any;
  @Input() id_tramite!: number;
  @Input() tramiteDatos: any;      // Recibe el objeto completo
  @Input() documentos: any[] = []; // Recibe la lista de documentos
  public tab_active: number = 1;

  constructor(
    public activeModal: NgbActiveModal // Para poder cerrar este modal
  ) {}

  ngOnInit(): void {
    // Aquí ya puedes usar los datos
    console.log('ID Trámite recibido en VerTramite:', this.id_tramite);
    console.log('Documentos recibidos:', this.documentos);
    
    if (this.tramiteDatos) {
      console.log('Asunto del trámite:', this.tramiteDatos.asunto_tramite);
    }
  }

  verDocumento(doc: any) {
    console.log('Visualizando documento:', doc);
    // Aquí puedes implementar la lógica para abrir el archivo, por ejemplo:
    // window.open(doc.url_archivo, '_blank');
  }

}