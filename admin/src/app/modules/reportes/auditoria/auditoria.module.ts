import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuditoriaRoutingModule } from './auditoria-routing.module';
import { AuditoriaComponent } from '../auditoria/auditoria.component';
import { VerComponent } from './ver/ver.component';
import { VisorPdfComponent } from './visor-pdf/visor-pdf.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { SafeUrlPipe } from './pipes/safe-url.pipe';


@NgModule({
  declarations: [
    AuditoriaComponent,
    VerComponent,
    VisorPdfComponent,
    SafeUrlPipe
  ],
  imports: [
    CommonModule,
    AuditoriaRoutingModule,
    
         HttpClientModule,
               FormsModule,
                  NgbModule,
                    ReactiveFormsModule,
                    InlineSVGModule,
                    NgbModalModule,
                    NgbPaginationModule,
  ]
})
export class AuditoriaModule { }
