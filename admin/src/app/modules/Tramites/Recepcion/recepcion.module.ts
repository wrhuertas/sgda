import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Importaciones de Terceros
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular'; // <--- 1. IMPORTACIÓN AGREGADA

// Ruteo y Componentes locales
import { RecepcionRoutingModule } from './recepcion-routing.module';
import { RecepcionComponent } from './recepcion.component';
import { ListarTramiteComponent } from './listar-tramite/listar-tramite.component';
import { AsignarTramiteComponent } from './asignar-tramite/asignar-tramite.component';
import { VerDatosComponent } from './ver-datos/ver-datos.component';
import { SeguimientoComponent } from './seguimiento/seguimiento.component';
import { UsuarioAreaComponent } from './usuario-area/usuario-area.component';
import { NuevoTramiteComponent } from './nuevo-tramite/nuevo-tramite.component';
import { BuscarUsuarioComponent } from './buscar-usuario/buscar-usuario.component';
import { VerTramiteComponent } from './ver-tramite/ver-tramite.component';
import { VistaPreviaComponent } from './vista-previa/vista-previa.component';
import { MoverTramitesMasivoComponent } from './mover-tramites-masivo/mover-tramites-masivo.component';
import { UsuarioEnvioMasivoComponent } from './usuario-envio-masivo/usuario-envio-masivo.component';
import { VistaMasivaPreviaComponent } from './vista-masiva-previa/vista-masiva-previa.component';
import { VerDocumentoModule } from 'src/app/modules/indexacion-serie/ver-documento/ver-documento.module';


@NgModule({
  declarations: [
    RecepcionComponent,
    ListarTramiteComponent,
    AsignarTramiteComponent,
    VerDatosComponent,
    SeguimientoComponent,
    UsuarioAreaComponent,
    NuevoTramiteComponent,
    BuscarUsuarioComponent,
    VerTramiteComponent,
    VistaPreviaComponent,
    MoverTramitesMasivoComponent,
    UsuarioEnvioMasivoComponent,
    VistaMasivaPreviaComponent
  ],
  imports: [
    CommonModule,
    RecepcionRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    NgbModalModule,
    NgbPaginationModule,
    InlineSVGModule,
    CKEditorModule, // <--- 2. MÓDULO AGREGADO AQUÍ
    VerDocumentoModule
  ]
})
export class RecepcionModule { }