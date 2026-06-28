import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TipoTramitesRoutingModule } from './tipo-tramites-routing.module';
import { CrearTipotramiteComponent } from './crear-tipotramite/crear-tipotramite.component';
import { EditarTipotramiteComponent } from './editar-tipotramite/editar-tipotramite.component';
import { EliminarTipotramiteComponent } from './eliminar-tipotramite/eliminar-tipotramite.component';
import { ListadoTipotramiteComponent } from './listado-tipotramite/listado-tipotramite.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { SharedModule } from 'src/app/_metronic/shared/shared.module';



@NgModule({
  declarations: [
    CrearTipotramiteComponent,
    EditarTipotramiteComponent,
    EliminarTipotramiteComponent,
    ListadoTipotramiteComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    TipoTramitesRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    NgbModalModule,
    NgbPaginationModule,
    InlineSVGModule,
    CKEditorModule
  ]
})
export class TipoTramitesModule { }
