import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { URL_SERVICIOS } from 'src/app/config/config';
import { DocumentoViewerService } from 'src/app/modules/indexacion-serie/ver-documento/documento-viewer.service';

/**
 * Muestra el memorandum de una asignación.
 *
 * El documento en sí es el acta que se generó al crearlo, así que acá se
 * resuelve cuál es y se abre con el visor que ya usa todo el sistema.
 */
@Component({
  selector: 'app-ver-memorandum',
  templateUrl: './ver-memorandum.component.html',
  styleUrls: ['./ver-memorandum.component.scss']
})
export class VerMemorandumComponent implements OnInit {

  /** Cualquiera de los dos alcanza para ubicar el memorandum */
  @Input() id_asignacion_tramite: number | null = null;
  @Input() num_documento_interno: string = '';

  cargando = false;
  error: string = '';
  memorandum: any = null;
  acta: any = null;

  constructor(
    public activeModal: NgbActiveModal,
    private http: HttpClient,
    private toast: ToastrService,
    private documentoViewer: DocumentoViewerService
  ) {}

  ngOnInit(): void {
    this.cargarActa();
  }

  private cabeceras(): HttpHeaders {
    return new HttpHeaders({
      Authorization: 'Bearer ' + (localStorage.getItem('token') || '')
    });
  }

  cargarActa(): void {
    if (!this.id_asignacion_tramite && !this.num_documento_interno) {
      this.error = 'No se recibió el memorandum a mostrar';
      return;
    }

    this.cargando = true;
    this.error = '';

    this.http.post(URL_SERVICIOS + '/prestamo/acta-memorandum', {
      id_asignacion_tramite: this.id_asignacion_tramite,
      num_documento_interno: this.num_documento_interno
    }, { headers: this.cabeceras() }).subscribe({
      next: (resp: any) => {
        this.cargando = false;
        this.memorandum = resp?.memorandum || null;
        this.acta = resp?.acta || null;

        if (this.acta?.ruta) {
          this.verDocumento();
        } else {
          this.error = 'El memorandum no tiene un documento guardado';
        }
      },
      error: (err: any) => {
        this.cargando = false;
        this.error = err?.error?.message || 'No se pudo obtener el memorandum';
      }
    });
  }

  /** Abre el acta con el visor de documentos del sistema */
  verDocumento(): void {
    if (!this.acta?.ruta) {
      this.toast.warning('El memorandum no tiene un documento guardado');
      return;
    }

    this.documentoViewer.abrirVer({
      rutaDocumento: this.acta.ruta,
      nombreArchivo: this.acta.nombre
    });
  }
}
