import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DocumentosRoutingModule } from './documentos-routing.module';
import { DocumentosComponent } from './documentos.component';
import { ListDocumentosComponent } from './list-documentos/list-documentos.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { ListaDocumentoNivelComponent } from './lista-documento-nivel/lista-documento-nivel.component';
import { CreateDocumentoComponent } from './create-documento/create-documento.component';
import { PermisoDocumentosComponent } from './permiso-documentos/permiso-documentos.component';


@NgModule({
  declarations: [
    DocumentosComponent,
    ListDocumentosComponent,
    ListaDocumentoNivelComponent,
    CreateDocumentoComponent,
    PermisoDocumentosComponent
  ],
  imports: [
    CommonModule,
    DocumentosRoutingModule,
    HttpClientModule,
      FormsModule,
      NgbModule,
      ReactiveFormsModule,
      InlineSVGModule,
      NgbModalModule,
      NgbPaginationModule,
      // BrowserModule,  <-- Quitar de aquí también
      NgxExtendedPdfViewerModule
  ]

})
export class DocumentosModule { }
