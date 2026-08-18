import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WorkflowRoutingModule } from './workflow-routing.module';
import { ListaFormularioComponent } from './lista-formulario/lista-formulario.component';
import { CrearTrabajoComponent } from './crear-trabajo/crear-trabajo.component';
import { EditarTrabajoComponent } from './editar-trabajo/editar-trabajo.component';
import { VerTrabajoComponent } from './ver-trabajo/ver-trabajo.component';


@NgModule({
  declarations: [
    ListaFormularioComponent,
    CrearTrabajoComponent,
    EditarTrabajoComponent,
    VerTrabajoComponent
  ],
  imports: [
    CommonModule,
    WorkflowRoutingModule
  ]
})
export class WorkflowModule { }
