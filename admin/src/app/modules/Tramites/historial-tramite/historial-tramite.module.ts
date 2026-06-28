import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';

import { HistorialTramiteRoutingModule } from './historial-tramite-routing.module';
import { HistorialTramiteComponent } from './historial-tramite.component';
import { ListadoTramiteComponent } from './listado-tramite/listado-tramite.component';
import { AsignarTramiteComponent } from './asignar-tramite/asignar-tramite.component';
import { BuscarUsuarioComponent } from './buscar-usuario/buscar-usuario.component';
import { UsuarioAreaComponent } from './usuario-area/usuario-area.component';
import { VistaPreviaComponent } from './vista-previa/vista-previa.component';
import { VerTramiteComponent } from './ver-tramite/ver-tramite.component';
import { VerDatosComponent } from './ver-datos/ver-datos.component';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { NuevoTramiteComponent } from './nuevo-tramite/nuevo-tramite.component';

@NgModule({
  declarations: [
    HistorialTramiteComponent,
    ListadoTramiteComponent,
    AsignarTramiteComponent,
    BuscarUsuarioComponent,
    UsuarioAreaComponent,
    VistaPreviaComponent,
    VerTramiteComponent,
    VerDatosComponent,
    NuevoTramiteComponent
  ],
  imports: [
    CommonModule,
    HistorialTramiteRoutingModule,
    RouterModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    NgbModalModule,
    NgbPaginationModule,
    InlineSVGModule,
    CKEditorModule
  ]
})
export class HistorialTramiteModule {}
