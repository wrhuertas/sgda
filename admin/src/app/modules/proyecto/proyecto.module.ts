import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProyectoRoutingModule } from './proyecto-routing.module';
import { ProyectoComponent } from './proyecto.component';
import { CreateProyectoComponent } from './create-proyecto/create-proyecto.component';
import { UpdateProyectoComponent } from './update-proyecto/update-proyecto.component';
import { ListProyectoComponent } from './list-proyecto/list-proyecto.component';
import { DeleteProyectoComponent } from './delete-proyecto/delete-proyecto.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';


@NgModule({
  declarations: [
    ProyectoComponent,
    CreateProyectoComponent,
    UpdateProyectoComponent,
    ListProyectoComponent,
    DeleteProyectoComponent
  ],
  imports: [
    CommonModule,
    ProyectoRoutingModule,
        
        HttpClientModule,
       FormsModule,
          NgbModule,
            ReactiveFormsModule,
            InlineSVGModule,
            NgbModalModule,
            NgbPaginationModule,
  ]
})
export class ProyectoModule { }
