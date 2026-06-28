import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DespachoRoutingModule } from './despacho-routing.module';
import { RecepcionRoutingModule } from '../Recepcion/recepcion-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { AsignarTramiteModule } from '../asignar-tramite/asignar-tramite.module';
import { AsignarTramiteComponent as DespachoAsignarTramiteComponent } from './asignar-tramite/asignar-tramite.component';
import { BuscarUsuarioComponent } from './buscar-usuario/buscar-usuario.component';
import { ListarTramiteComponent } from './listar-tramite/listar-tramite.component';
import { NuevoTramiteComponent } from './nuevo-tramite/nuevo-tramite.component';
import { UsuarioAreaComponent } from './usuario-area/usuario-area.component';
import { VerDatosComponent } from './ver-datos/ver-datos.component';
import { VerTramiteComponent } from './ver-tramite/ver-tramite.component';
import { VistaPreviaComponent } from './vista-previa/vista-previa.component';
import { DespachoComponent } from './despacho.component';



@NgModule({
  declarations: [
    DespachoComponent,
     ListarTramiteComponent,
        VerDatosComponent,
        UsuarioAreaComponent,
        NuevoTramiteComponent,
        BuscarUsuarioComponent,
        VerTramiteComponent,
        VistaPreviaComponent,
        DespachoAsignarTramiteComponent
  ],
  imports: [
    CommonModule,
    DespachoRoutingModule,
        RecepcionRoutingModule,
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        NgbModule,
        NgbModalModule,
        NgbPaginationModule,
        InlineSVGModule,
        CKEditorModule,
        AsignarTramiteModule
  ]
})
export class DespachoModule { }
