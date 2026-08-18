import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth';
import { AsignartramiteService } from '../service/asignartramite.service';
import { SumillarComponent } from '../sumillar/sumillar.component';

@Component({
  selector: 'app-anexos-sumillar',
  templateUrl: './anexos-sumillar.component.html',
  styleUrls: ['./anexos-sumillar.component.scss']
})
export class AnexosSumillarComponent {

  @Input() anexos: any[] = [];
@Input() id_tramite!: number;
@Input() numero_tramite: string = '';
  
    public sumillaText: string = '';
  

  constructor(
      public activeModal: NgbActiveModal,
        public modalService: NgbModal,
        public AsignarTramite: AsignartramiteService,
        public toast: ToastrService,
        private cdr: ChangeDetectorRef,
        public authService: AuthService,
      ) { }
  
  verAnexo(anexo: any) {
    const modalRef = this.modalService.open(SumillarComponent, {
              centered: true,
              size: 'xl',
              backdrop: 'static'
            });
      // Pasar el anexo al modal para que pueda mostrarlo y operar (ruta, nombre, etc.)
      try { 
        modalRef.componentInstance.anexo = anexo; 
        // Pasar id_empresa para que el modal pueda pedir la página al backend
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        modalRef.componentInstance.id_empresa = user?.id_empresa ?? null;
        // Al cerrar el modal con resultado, actualizar el estado del anexo en la lista
        modalRef.result.then((result: any) => {
          try {
            if (result && result.signed) {
              anexo.anexo_firmado = 1;
              if (result.ruta_doc_firmado) {
                anexo.ruta_doc_firmado = result.ruta_doc_firmado;
              } else if (result.nombre_pdf && anexo.ruta) {
                // construir ruta a partir de la carpeta del anexo original
                const parts = String(anexo.ruta).split('/');
                parts.pop(); // eliminar nombre original
                const folder = parts.join('/');
                anexo.ruta_doc_firmado = folder ? (folder + '/' + result.nombre_pdf) : result.nombre_pdf;
              } else if (result.nombre_pdf) {
                anexo.ruta_doc_firmado = result.nombre_pdf;
              }
              this.toast.success('Documento firmado correctamente');
              try { this.cdr.detectChanges(); } catch {}
            }
          } catch (e) { console.error('Error procesando resultado modal Sumillar:', e); }
        }).catch(() => {
          // modal dismissed
        });
      } catch {}
    }
  
    guardarSumilla() {
      // Devolver la sumilla al componente padre
      this.activeModal.close({ sumilla: this.sumillaText });
    }
  
    cerrar() {
      this.activeModal.dismiss();
    }

    abrirDocFirmado(anexo: any) {
      try {
        const publicBase = String(URL_SERVICIOS).replace(/\/api\/?$/i, '');
        let ruta = anexo.ruta_doc_firmado ?? anexo.ruta_doc_firmado ?? null;
        if (!ruta && anexo.ruta && anexo.nombre_anexo) {
          const folder = anexo.ruta.split('/').slice(0, -1).join('/');
          ruta = folder + '/' + ('FIRMADO_' + anexo.nombre_anexo);
        }
        if (!ruta) { this.toast.info('Ruta del documento firmado no disponible'); return; }
        if (!String(ruta).startsWith('/storage/') && !/^https?:\/\//i.test(String(ruta))) ruta = '/storage/' + String(ruta).replace(/^\//, '');
        const url = publicBase + ruta;
        window.open(url, '_blank');
      } catch (e) { console.error('abrirDocFirmado error:', e); this.toast.error('No se pudo abrir el documento firmado'); }
    }
  

}
