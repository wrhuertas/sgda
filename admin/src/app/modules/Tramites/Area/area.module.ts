import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AreaRoutingModule } from './area-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { AreaComponent } from './area.component';
import { EditarAreaComponent } from './editar-area/editar-area.component';
import { EliminarAreaComponent } from './eliminar-area/eliminar-area.component';
import { ListarAreaComponent } from './listar-area/listar-area.component';
import { RegistrarAreaComponent } from './registrar-area/registrar-area.component';


@NgModule({
  declarations: [
    AreaComponent,
    RegistrarAreaComponent,
    EditarAreaComponent,
    ListarAreaComponent,
    EliminarAreaComponent
  ],
  imports: [
    CommonModule,
    AreaRoutingModule,

      HttpClientModule,
       FormsModule,
          NgbModule,
            ReactiveFormsModule,
            InlineSVGModule,
            NgbModalModule,
            NgbPaginationModule,
  ]
})
export class AreaModule { }
