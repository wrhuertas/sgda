import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SubirExcelMasivoRoutingModule } from './subir-excel-masivo-routing.module';
import { SubirExcelMasivoComponent } from './subir-excel-masivo.component';


@NgModule({
  declarations: [
    SubirExcelMasivoComponent
  ],
  imports: [
    CommonModule,
    SubirExcelMasivoRoutingModule
  ]
})
export class SubirExcelMasivoModule { }
