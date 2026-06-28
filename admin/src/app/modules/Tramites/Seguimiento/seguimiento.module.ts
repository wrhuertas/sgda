import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SeguimientoRoutingModule } from './seguimiento-routing.module';
import { SeguimientoComponent } from './seguimiento.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { SeguimientoTramiteComponent } from './seguimiento-tramite/seguimiento-tramite.component';


@NgModule({
  declarations: [
    SeguimientoComponent,
    SeguimientoTramiteComponent
  ],
  imports: [
    CommonModule,
    SeguimientoRoutingModule,
    
            
                  HttpClientModule,
                   FormsModule,
                      NgbModule,
                        ReactiveFormsModule,
                        InlineSVGModule,
                        NgbModalModule,
                        NgbPaginationModule,
  ]
})
export class SeguimientoModule { }
