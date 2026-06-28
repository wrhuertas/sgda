import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MasivoRoutingModule } from './masivo-routing.module';
import { MasivoComponent } from './masivo.component';
import { VerMasivoComponent } from './ver-masivo/ver-masivo.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';


@NgModule({
  declarations: [
    MasivoComponent,
    VerMasivoComponent
  ],
  imports: [
    CommonModule,
    MasivoRoutingModule,
     HttpClientModule,
        FormsModule,
        NgbModule,
        ReactiveFormsModule,
        InlineSVGModule,
        NgbModalModule,
        NgbPaginationModule,
  ]
})
export class MasivoModule { }
