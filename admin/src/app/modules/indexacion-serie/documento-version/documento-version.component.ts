import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { IndexacionSerieService } from '../service/indexacion-serie.service';
import { DocumentoViewerService } from '../ver-documento/documento-viewer.service';

@Component({
  selector: 'app-documento-version',
  templateUrl: './documento-version.component.html',
  styleUrls: ['./documento-version.component.scss']
})
export class DocumentoVersionComponent implements OnInit {

  // Documento del que se mostrarán las versiones
  @Input() documento: any = null;
  // Contexto opcional
  @Input() idSerie: number | null = null;
  @Input() idSubSerie: number | null = null;
  @Input() idEmpresa: number | null = null;

  versiones: any[] = [];
  cargando: boolean = false;

  constructor(
    public activeModal: NgbActiveModal,
    private seccionesService: IndexacionSerieService,
    private documentoViewer: DocumentoViewerService
  ) {}

  ngOnInit(): void {
    const idDoc = this.documento?.id ?? this.documento?.id_documento ?? null;
    if (idDoc) {
      this.cargarVersiones(idDoc);
    }
  }

  cargarVersiones(idDocumento: number): void {
    this.cargando = true;
    this.seccionesService.versionesDocumento(idDocumento, this.idEmpresa).subscribe({
      next: (resp: any) => {
        this.versiones = resp?.versiones || [];
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando versiones:', err);
        this.versiones = [];
        this.cargando = false;
      }
    });
  }

  // Abrir el visor para una versión específica (usa el servicio global)
  verVersion(v: any): void {
    const modalRef = this.documentoViewer.abrirVer({
      idDocumento: v?.id,
      idEmpresa: this.idEmpresa,
      idSerieSubserie: this.idSubSerie ?? this.idSerie
    });
    // Si se guardó una nueva versión, recargar el listado de versiones
    modalRef.result.then((res: any) => {
      if (res && res.accion === 'nueva_version') {
        const idDoc = this.documento?.id ?? this.documento?.id_documento ?? null;
        if (idDoc) { this.cargarVersiones(idDoc); }
      }
    }).catch(() => {});
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }
}
