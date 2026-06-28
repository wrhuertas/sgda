import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IndexacionSerieRoutingModule } from './indexacion-serie-routing.module';
import { IndexacionSerieComponent } from './indexacion-serie.component';
import { ListIndexacionSerieComponent } from './list-indexacion-serie/list-indexacion-serie.component';
import { CreateIndexacionSerieComponent } from './create-indexacion-serie/create-indexacion-serie.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { VerDocumentoComponent } from './ver-documento/ver-documento.component';
import { IndexarDocumentoComponent } from './indexar-documento/indexar-documento.component';
import { IngresarInformacionComponent } from './ingresar-informacion/ingresar-informacion.component';
import { SubirAnexosComponent } from './subir-anexos/subir-anexos.component';
import { HacerOcrComponent } from './hacer-ocr/hacer-ocr.component';
import { HacerOcrIAComponent } from './hacer-ocr-ia/hacer-ocr-ia.component';
import { ControlCalidadComponent } from './control-calidad/control-calidad.component';
import { CrearLugarDocumentoComponent } from './crear-lugar-documento/crear-lugar-documento.component';
import { EditarLugarDocumentoComponent } from './editar-lugar-documento/editar-lugar-documento.component';


@NgModule({
  declarations: [
    IndexacionSerieComponent,
    ListIndexacionSerieComponent,
    CreateIndexacionSerieComponent,
    VerDocumentoComponent,
    IndexarDocumentoComponent,
    IngresarInformacionComponent,
    SubirAnexosComponent,
    HacerOcrComponent,
    HacerOcrIAComponent,
    ControlCalidadComponent,
    CrearLugarDocumentoComponent,
    EditarLugarDocumentoComponent
  ],


  imports: [
      CommonModule,
      IndexacionSerieRoutingModule,
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
export class IndexacionSerieModule { }
