import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AsignarTramiteRoutingModule } from './asignar-tramite-routing.module';
import { ListTramitesComponent } from './list-tramites/list-tramites.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { RouterModule } from '@angular/router';
import { AsignarTramiteComponent } from './asignar-tramite.component';
import { RegistrarAsignacionComponent } from './registrar-asignacion/registrar-asignacion.component';
import { BuscarUsuarioComponent } from './buscar-usuario/buscar-usuario.component';
import { VerTramiteComponent } from './ver-tramite/ver-tramite.component';
import { SeguimientoComponent } from './seguimiento/seguimiento.component';
import { VistaPreviaComponent } from './vista-previa/vista-previa.component';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { VerDatosComponent } from './ver-datos/ver-datos.component';
import { AnexosSumillarComponent } from './anexos-sumillar/anexos-sumillar.component';
import { SumillarComponent } from './sumillar/sumillar.component';
import { VistaActaComponent } from './vista-acta/vista-acta.component';
import { VerActasComponent } from './ver-actas/ver-actas.component';
import { VerDocumentoModule } from 'src/app/modules/indexacion-serie/ver-documento/ver-documento.module';
import { CrearTramiteComponent } from './crear-tramite/crear-tramite.component';


@NgModule({
  declarations: [
    ListTramitesComponent,
     AsignarTramiteComponent,
     RegistrarAsignacionComponent,
     // Componentes usados dentro de este módulo (en modales y vistas)
     BuscarUsuarioComponent,
     VerTramiteComponent,
     SeguimientoComponent,
     VistaPreviaComponent,
     VerDatosComponent,
     AnexosSumillarComponent,
     SumillarComponent,
     VistaActaComponent,
     VerActasComponent,
     CrearTramiteComponent,
  ],
  imports: [
    CommonModule,
    AsignarTramiteRoutingModule,
       
                     RouterModule,
                          HttpClientModule,
                           FormsModule,
                              NgbModule,
                                ReactiveFormsModule,
                                InlineSVGModule,
                                NgbModalModule,
                                NgbPaginationModule,
                                CKEditorModule,
                                VerDocumentoModule,
      ]
  
})
export class AsignarTramiteModule { }
