import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReportesRoutingModule } from './reportes-routing.module';
import { ReportesComponent } from './reportes.component';
import { ReportesListComponent } from './reportes-list/reportes-list.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';


@NgModule({
  declarations: [
    ReportesComponent,
    ReportesListComponent
  ],
  imports: [
    CommonModule,
    ReportesRoutingModule,
     HttpClientModule,
           FormsModule,
              NgbModule,
                ReactiveFormsModule,
                InlineSVGModule,
                NgbModalModule,
                NgbPaginationModule,
  ]
})
export class ReportesModule { }
