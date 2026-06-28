import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CronogramaProformasRoutingModule } from './cronograma-proformas-routing.module';
import { CronogramaProformasComponent } from './cronograma-proformas.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { FullCalendarModule } from '@fullcalendar/angular';

@NgModule({
  declarations: [
    CronogramaProformasComponent
  ],
  imports: [
    CommonModule,
    CronogramaProformasRoutingModule,
    FullCalendarModule, // register FullCalendar with your app
    HttpClientModule,
    FormsModule,
    NgbModule,
    ReactiveFormsModule,
    InlineSVGModule,
    NgbModalModule,
    NgbPaginationModule,
  ]
})
export class CronogramaProformasModule { }
