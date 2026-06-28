import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DescargarRoutingModule } from './descargar-routing.module';
import { DescargarComponent } from './descargar.component';


@NgModule({
  declarations: [
    DescargarComponent
  ],
  imports: [
    CommonModule,
    DescargarRoutingModule
  ]
})
export class DescargarModule { }
