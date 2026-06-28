import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClienteRoutingModule } from './cliente-routing.module';
import { ClienteComponent } from '../Cliente/cliente.component';
import { RegistrarClienteComponent } from './registrar-cliente/registrar-cliente.component';
import { EditarClienteComponent } from './editar-cliente/editar-cliente.component';
import { EliminarClienteComponent } from './eliminar-cliente/eliminar-cliente.component';
import { ListarClienteComponent } from './listar-cliente/listar-cliente.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';


@NgModule({
  declarations: [
    ClienteComponent,
      RegistrarClienteComponent, EditarClienteComponent, EliminarClienteComponent, 
         ListarClienteComponent,

  ],
  imports: [
    CommonModule,
    ClienteRoutingModule,
    
            
                  HttpClientModule,
                   FormsModule,
                      NgbModule,
                        ReactiveFormsModule,
                        InlineSVGModule,
                        NgbModalModule,
                        NgbPaginationModule,
    

  ]
})
export class ClienteModule { }
