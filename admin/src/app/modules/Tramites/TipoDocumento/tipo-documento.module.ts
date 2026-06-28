import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TipoDocumentoRoutingModule } from './tipo-documento-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { EditarDocumentoComponent } from './editar-documento/editar-documento.component';
import { EliminarDocumentoComponent } from './eliminar-documento/eliminar-documento.component';
import { ListarDocumentoComponent } from './listar-documento/listar-documento.component';
import { RegistrarDocumentoComponent } from './registrar-documento/registrar-documento.component';



@NgModule({
  declarations: [
    RegistrarDocumentoComponent,
         EditarDocumentoComponent, EliminarDocumentoComponent, ListarDocumentoComponent, 
  ],
  imports: [
    CommonModule,
    TipoDocumentoRoutingModule,
        
              HttpClientModule,
               FormsModule,
                  NgbModule,
                    ReactiveFormsModule,
                    InlineSVGModule,
                    NgbModalModule,
                    NgbPaginationModule,


  ]
})
export class TipoDocumentoModule { }
