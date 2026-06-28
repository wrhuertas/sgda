import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RegistrarTramiteRoutingModule } from './registrar-tramite-routing.module';
import { RegistrarTramiteComponent } from './registrar-tramite.component';
// 👇 IMPORTA EL COMPONENTE DE REGISTRO
import { RegistrarComponent } from './registrar/registrar.component'; 

import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { RouterModule } from '@angular/router';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';

@NgModule({
  declarations: [
    RegistrarTramiteComponent,
    RegistrarComponent // 👈 AGREGALO AQUÍ PARA QUE RECONOZCA EL NGMODEL
  ],
  imports: [
    CommonModule,
    RegistrarTramiteRoutingModule,
    RouterModule,
    HttpClientModule,
    FormsModule,
    NgbModule,
    ReactiveFormsModule,
    InlineSVGModule,
    NgbModalModule,
    NgbPaginationModule,
    CKEditorModule,
  ]
})
export class RegistrarTramiteModule { }