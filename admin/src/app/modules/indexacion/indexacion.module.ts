import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IndexacionRoutingModule } from './indexacion-routing.module';
import { IndexacionComponent } from './indexacion.component';
import { CreateIndexacionComponent } from './create-indexacion/create-indexacion.component';
import { ListIndexacionComponent } from './list-indexacion/list-indexacion.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
// import { BrowserModule } from '@angular/platform-browser';  <-- Quitar esta línea
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@NgModule({
  declarations: [
    IndexacionComponent,
    CreateIndexacionComponent,
    ListIndexacionComponent
  ],
  imports: [
    CommonModule,
    IndexacionRoutingModule,
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
export class IndexacionModule { }
