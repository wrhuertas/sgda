import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuditoriaDocuemntalRoutingModule } from './auditoria-docuemntal-routing.module';
import { AuditoriaDocuemntalComponent } from './auditoria-docuemntal.component';
import { VerComponent } from './ver/ver.component';


@NgModule({
  declarations: [
    AuditoriaDocuemntalComponent,
    VerComponent
  ],
  imports: [
    CommonModule,
    AuditoriaDocuemntalRoutingModule
  ]
})
export class AuditoriaDocuemntalModule { }
