import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HistorialTramiteComponent } from './historial-tramite.component';
import { ListadoTramiteComponent } from './listado-tramite/listado-tramite.component';

const routes: Routes = [

  {
        path: '',
        component: HistorialTramiteComponent,
        children: [
          {
            path: 'historial',
            component: ListadoTramiteComponent,
          },
        ],
      },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HistorialTramiteRoutingModule { }
