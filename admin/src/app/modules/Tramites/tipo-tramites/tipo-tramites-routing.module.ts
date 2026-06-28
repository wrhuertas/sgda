import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListadoTipotramiteComponent } from './listado-tipotramite/listado-tipotramite.component';
import { TipoTramitesComponent } from './tipo-tramites.component';

const routes: Routes = [
  {
    path: '',
    component: TipoTramitesComponent,
    children: [
      {
        path: 'list',
        component: ListadoTipotramiteComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TipoTramitesRoutingModule { }
