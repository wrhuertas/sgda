import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SerieRoutingModule } from './serie-routing.module';
import { SerieComponent } from './serie.component';
import { EditSerieComponent } from './edit-serie/edit-serie.component';
import { CreateSerieComponent } from './create-serie/create-serie.component';
import { ListSerieComponent } from './list-serie/list-serie.component';
import { DeleteSerieComponent } from './delete-serie/delete-serie.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { EtiquetaComponent } from './etiqueta/etiqueta.component';


@NgModule({
  declarations: [
    SerieComponent,
    EditSerieComponent,
    CreateSerieComponent,
    ListSerieComponent,
    DeleteSerieComponent,
    EtiquetaComponent
  ],
 
    imports: [
        CommonModule,
        RouterModule,              // 👈 agregado
        SerieRoutingModule,
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        NgbModule,
        NgbModalModule,
        NgbPaginationModule,
        InlineSVGModule
      ]
})
export class SerieModule { }
