import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SubserieRoutingModule } from './subserie-routing.module';
import { SubserieComponent } from './subserie.component';
import { CreateSubserieComponent } from './create-subserie/create-subserie.component';
import { EditSubserieComponent } from './edit-subserie/edit-subserie.component';
import { DeleteSubserieComponent } from './delete-subserie/delete-subserie.component';
import { ListSubserieComponent } from './list-subserie/list-subserie.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { EtiquetaComponent } from './etiqueta/etiqueta.component';


@NgModule({
  declarations: [
    SubserieComponent,
    CreateSubserieComponent,
    EditSubserieComponent,
    DeleteSubserieComponent,
    ListSubserieComponent,
    EtiquetaComponent
  ],
 

   imports: [
      CommonModule,
      RouterModule,              // 👈 agregado
      SubserieRoutingModule,
      HttpClientModule,
      FormsModule,
      ReactiveFormsModule,
      NgbModule,
      NgbModalModule,
      NgbPaginationModule,
      InlineSVGModule
    ]
})
export class SubserieModule { }
