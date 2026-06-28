import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ModulosRoutingModule } from './modulos-routing.module';
import { ModulosComponent } from './modulos.component';
import { CreateModuloComponent } from './create-modulo/create-modulo.component';
import { EditModuloComponent } from './edit-modulo/edit-modulo.component';
import { ListModuloComponent } from './list-modulo/list-modulo.component';
import { DeleteModuloComponent } from './delete-modulo/delete-modulo.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';


@NgModule({
  declarations: [
    ModulosComponent,
    CreateModuloComponent,
    EditModuloComponent,
    ListModuloComponent,
    DeleteModuloComponent
  ],
  imports: [
    CommonModule,
    ModulosRoutingModule,

        
        HttpClientModule,
       FormsModule,
          NgbModule,
            ReactiveFormsModule,
            InlineSVGModule,
            NgbModalModule,
            NgbPaginationModule,
  ]
})
export class ModulosModule { }
