import { Component } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { isPermission } from 'src/app/config/config';
import { CrearCertificadoComponent } from '../crear-certificado/crear-certificado.component';
import { EditarCertificadoComponent } from '../editar-certificado/editar-certificado.component';
import { EliminarCertificadoComponent } from '../eliminar-certificado/eliminar-certificado.component';
import { CertificadoService } from '../service/certificado.service';
import { VerCertificadoComponent } from '../ver-certificado/ver-certificado.component';
import { HttpClient } from '@angular/common/http';
import { URL_SERVICIOS } from 'src/app/config/config';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-list-certificado',
  templateUrl: './list-certificado.component.html',
  styleUrls: ['./list-certificado.component.scss']
})
export class ListCertificadoComponent {

    
      search:string = '';
      CERTIFICACIONES:any = [];
      isLoading$:any;
    
      totalPages:number = 0;
      currentPage:number = 1;
  
      id_empresa: any;
  
      public URL_SERVICIOS: string = URL_SERVICIOS;

      constructor(
        public modalService: NgbModal,
        public certificadoService: CertificadoService,
        private http: HttpClient,
        private toast: ToastrService,
      ) {
        
      }
    
      ngOnInit(): void {
        // Extraer el usuario del local storage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.log("👤 Usuario logueado desde prestamo:", user);
        if (user && user.id_empresa) {
          this.id_empresa = user.id_empresa;
        }
        //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
        //Add 'implements OnInit' to the class.
        this.isLoading$ = this.certificadoService.isLoading$;
        this.listCertificados();
      }

      imprimirActaFirmada(cert: any) {
        if (!cert.id_certificacion) {
          this.toast.error('ID de certificación no válido.');
          return;
        }

        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const urlDocumento = `${this.URL_SERVICIOS}/certificaciones/ver-acta-firmada/${cert.id_certificacion}`;

        if (this.toast) this.toast.info('Descargando archivo desde el servidor...', 'Por favor espere');

        this.http.get(urlDocumento, { headers, responseType: 'blob' }).subscribe({
          next: (blob: Blob) => {
            const data = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = data;
            const nombreArchivo = cert.ruta_documento_pdf ? cert.ruta_documento_pdf.split('/').pop() : `Cert_${cert.id_certificacion}.pdf`;
            link.setAttribute('download', nombreArchivo);
            link.target = '_self';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(data);
            if (this.toast) this.toast.success('Acta descargada correctamente.');
          },
          error: (err) => {
            console.error('Error al descargar el acta de certificación:', err);
            this.toast.error('Error al descargar el archivo. Verifique su autenticación.');
          }
        });
      }
    
      listCertificados(page = 1) {
        this.certificadoService.listCertificados(page, this.search, this.id_empresa).subscribe((resp: any) => {
          this.CERTIFICACIONES = resp.certificados || [];
          this.totalPages = resp.total;
          this.currentPage = page;
        });
      }
    
      loadPage($event:any){
        this.listCertificados($event);
      }
    
      createPrestamo() {
        const modalRef = this.modalService.open(CrearCertificadoComponent, {
          centered: true,
          size: 'xl', // Cambiado a 'lg' para que los formularios de documentos se vean mejor
          windowClass: 'modal-ancho-personalizado',
          backdrop: 'static'
        });
  
        // Escuchamos el evento de salida del componente hijo (el modal)
    modalRef.componentInstance.PrestamoC?.subscribe((cert: any) => {
      if (cert) {
        this.CERTIFICACIONES.unshift(cert);
      }
      // Refrescamos listado para asegurar datos consistentes desde backend
      this.listCertificados(this.currentPage);
    });
  }
    
      EntregarPrestamo(PRESTAMO:any){
        const modalRef = this.modalService.open(EditarCertificadoComponent,{
          centered: true,
          size: 'xl', // Cambiado a 'lg' para que los formularios de documentos se vean mejor
          windowClass: 'modal-ancho-personalizado',
          backdrop: 'static'
        });
        modalRef.componentInstance.PRESTAMO_SELECTED = PRESTAMO;
    
        modalRef.componentInstance.PrestamoE?.subscribe((cert:any) => {
          const INDEX = this.CERTIFICACIONES.findIndex((c:any) => c.id_certificacion === PRESTAMO.id_certificacion);
          if (INDEX !== -1) {
            this.CERTIFICACIONES[INDEX] = cert;
          }
        })
      }
    
  
      VerPrestamo(PRESTAMO:any){
        const modalRef = this.modalService.open(VerCertificadoComponent,{centered:true, size: 'md'});
        modalRef.componentInstance.PRESTAMO_SELECTED = PRESTAMO;
    
        modalRef.componentInstance.PrestamoE?.subscribe((cert:any) => {
          const INDEX = this.CERTIFICACIONES.findIndex((c:any) => c.id_certificacion === PRESTAMO.id_certificacion);
          if (INDEX !== -1) {
            this.CERTIFICACIONES[INDEX] = cert;
          }
        })
      }
  
  
      deletePrestamo(PRESTAMO:any){
        const modalRef = this.modalService.open(EliminarCertificadoComponent,{centered:true, size: 'md'});
        modalRef.componentInstance.PRESTAMO_SELECTED = PRESTAMO;
    
        modalRef.componentInstance.PrestamoD?.subscribe((cert:any) => {
          const INDEX = this.CERTIFICACIONES.findIndex((c:any) => c.id_certificacion === PRESTAMO.id_certificacion);
          if (INDEX !== -1) {
            this.CERTIFICACIONES.splice(INDEX, 1);
          }
        })
      }
    
    isPermission(permission:string){
       return isPermission(permission);
     }
  
  
     viewPrestamo(PRESTAMO: any) {
          console.log("Visualizando préstamo:", PRESTAMO);
          // Aquí puedes abrir un modal de detalle o navegar a otra ruta
          // Ejemplo: este.modalService.open(DetalleComponent, { data: PRESTAMO });
      }
  
      entregarPrestamo(PRESTAMO: any) {
        
      }

}
