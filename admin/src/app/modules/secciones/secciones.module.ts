import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SeccionesRoutingModule } from './secciones-routing.module';
import { SeccionesComponent } from './secciones.component';
import { ListSessionesComponent } from './list-sessiones/list-sessiones.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { DetalleSessionesComponent } from './detalle-sessiones/detalle-sessiones.component';
import { CreateDocumentoSessionesComponent } from './create-documento-sessiones/create-documento-sessiones.component';
import { VerDocumentoSessionesComponent } from './ver-documento-sessiones/ver-documento-sessiones.component';


@NgModule({
  declarations: [
    SeccionesComponent,
    ListSessionesComponent,
    DetalleSessionesComponent,
    CreateDocumentoSessionesComponent,
    VerDocumentoSessionesComponent
  ],
  imports: [
    CommonModule,
    SeccionesRoutingModule,

            HttpClientModule,
           FormsModule,
              NgbModule,
                ReactiveFormsModule,
                InlineSVGModule,
                NgbModalModule,
                NgbPaginationModule,
                

  ],
   exports: [
    ListSessionesComponent  // 👈 AÑADE ESTO
  ]
})
export class SeccionesModule { }
