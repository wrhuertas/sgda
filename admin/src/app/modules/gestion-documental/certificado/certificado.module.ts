import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CertificadoRoutingModule } from './certificado-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbNavModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { IndexacionSerieRoutingModule } from '../../indexacion-serie/indexacion-serie-routing.module';
import { ListCertificadoComponent } from './list-certificado/list-certificado.component';
import { CrearCertificadoComponent } from './crear-certificado/crear-certificado.component';
import { EditarCertificadoComponent } from './editar-certificado/editar-certificado.component';
import { DevolucionCertificadoComponent } from './devolucion-certificado/devolucion-certificado.component';
import { EliminarCertificadoComponent } from './eliminar-certificado/eliminar-certificado.component';
import { FirmarCertificadoComponent } from './firmar-certificado/firmar-certificado.component';
import { VerCertificadoComponent } from './ver-certificado/ver-certificado.component';
import { EnviarcorreoCertificadoComponent } from './enviarcorreo-certificado/enviarcorreo-certificado.component';
import { VerpaginasCertificadoComponent } from './verpaginas-certificado/verpaginas-certificado.component';


@NgModule({
  declarations: [
    ListCertificadoComponent,
    CrearCertificadoComponent,
    EditarCertificadoComponent,
    DevolucionCertificadoComponent,
    EliminarCertificadoComponent,
    FirmarCertificadoComponent,
    VerCertificadoComponent,
    EnviarcorreoCertificadoComponent,
    VerpaginasCertificadoComponent
  ],
  
  
    imports: [
        CommonModule,
        CertificadoRoutingModule,
        HttpClientModule,
        FormsModule,
        NgbModule,
        ReactiveFormsModule,
        InlineSVGModule,
        NgbModalModule,
        NgbNavModule, 
        NgbPaginationModule,
        // BrowserModule,  <-- Quitar de aquí también
        NgxExtendedPdfViewerModule
      ]
})
export class CertificadoModule { }
