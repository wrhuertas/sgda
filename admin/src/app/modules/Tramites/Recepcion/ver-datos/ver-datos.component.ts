import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { RecepcionService } from '../service/recepcion.service';
import { URL_BACKEND } from 'src/app/config/config';
import { DocumentoViewerService } from 'src/app/modules/indexacion-serie/ver-documento/documento-viewer.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ver-datos',
  templateUrl: './ver-datos.component.html',
  styleUrls: ['./ver-datos.component.scss']
})
export class VerDatosComponent {

    @Input() id_tramite!: number;
  @Input() tramiteDatos!: any;
  @Output() tramiteC = new EventEmitter<void>();
  @Input() areas: any[] = [];
  tramite: any = null;
  cargando: boolean = false;
  
  // Propiedades para controlar qué se muestra dinámicamente
  tieneTipoTramiteYDocumento: boolean = false;
  tieneCiudadYFecha: boolean = false;


   constructor(public activeModal: NgbActiveModal,
       public recepcionService: RecepcionService,
       public toast: ToastrService,
           private cdr: ChangeDetectorRef,
           public authService: AuthService,
            public modalService: NgbModal,
            private documentoViewer: DocumentoViewerService,
    ) {}

    // Ver un archivo (anexo o acta) en el visor-plantilla, trayéndolo por API como base64
    verArchivo(ruta: string) {
      const r = (ruta || '').toString().trim();
      if (!r) { this.toast.warning('No se encontró la ruta del documento'); return; }

      Swal.fire({ title: 'Cargando documento...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      this.recepcionService.verAnexoBase64(r).subscribe({
        next: (resp: any) => {
          try { Swal.close(); } catch {}
          if (resp?.success && resp?.base64) {
            this.documentoViewer.abrirVer({ pdfBase64: resp.base64 });
          } else {
            this.toast.error(resp?.message || 'No se pudo obtener el documento');
          }
        },
        error: (err) => {
          try { Swal.close(); } catch {}
          console.error('Error trayendo documento:', err);
          this.toast.error('No se pudo cargar el documento');
        }
      });
    }

     ngOnInit() {
       console.log('ID TRÁMITE RECIBIDO para ver :', this.id_tramite);
        this.datosTramite(this.id_tramite);
      }

      
       datosTramite(id_tramite: number) {
         this.cargando = true;
         this.recepcionService.datosTramite(id_tramite).subscribe({
           next: (resp: any) => {
             console.log('📦 Respuesta del API:', resp);

             this.tramite = resp?.tramite ?? resp?.data ?? resp;
             
             // Detectar dinámicamente qué campos existen
             this.detectarTiposTramite();
             
             this.cargando = false;
             this.cdr.detectChanges();
           },
           error: (err) => {
             console.error('Error cargando trámite:', err);
             this.tramite = this.tramiteDatos ?? null;
             
             // Detectar dinámicamente qué campos existen
             this.detectarTiposTramite();
             
             this.cargando = false;
             this.toast.error('No se pudo cargar el trámite');
             this.cdr.detectChanges();
           }
         });
       }

       // Método para detectar qué tipo de trámite es (con tipo_tramite/tipo_documento o con ciudad/fecha)
       detectarTiposTramite() {
         if (!this.tramite) return;
         
         // Verificar si tiene tipo_tramite_nombre y tipo_documento_nombre
         this.tieneTipoTramiteYDocumento = !!(this.tramite.tipo_tramite_nombre || this.tramite.tipo_documento_nombre);
         
         // Verificar si tiene ciudad y fecha_tramite_oficio
         this.tieneCiudadYFecha = !!(this.tramite.ciudad || this.tramite.fecha_tramite_oficio);
       }


       // Método para construir la URL del archivo desde el backend de Laravel
       construirUrlArchivo(ruta: string): string {
         if (!ruta) return '';
         
         // Si ya es una URL absoluta, devolverla tal cual
         if (ruta.startsWith('http://') || ruta.startsWith('https://')) {
           return ruta;
         }
         
         // Construir la URL completa al archivo en el backend
         // URL_BACKEND ya incluye la barra final: 'http://127.0.0.1:8000/'
         // La ruta viene como: empresa_2/anexos/T-1720643442-000004/nombre.pdf
         return URL_BACKEND + 'storage/' + ruta;
       }

       cerrar() {
         this.activeModal?.close();
       }


}
