import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EmpresasRoutingModule } from './empresas-routing.module';
import { EmpresasComponent } from './empresas.component';
import { CreateEmpresaComponent } from './create-empresa/create-empresa.component';
import { EditEmpresaComponent } from './edit-empresa/edit-empresa.component';
import { ListEmpresaComponent } from './list-empresa/list-empresa.component';
import { DeleteEmpresaComponent } from './delete-empresa/delete-empresa.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';


@NgModule({
  declarations: [
    EmpresasComponent,
    CreateEmpresaComponent,
    EditEmpresaComponent,
    ListEmpresaComponent,
    DeleteEmpresaComponent
  ],
  imports: [
    CommonModule,
    EmpresasRoutingModule,
    
    HttpClientModule,
   FormsModule,
      NgbModule,
        ReactiveFormsModule,
        InlineSVGModule,
        NgbModalModule,
        NgbPaginationModule,
  ]
})
export class EmpresasModule { }
