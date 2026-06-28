import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RecepcionComponent } from './recepcion.component';
import { ListarTramiteComponent } from './listar-tramite/listar-tramite.component';

const routes: Routes = [


   {
        path: '',
        component: RecepcionComponent,
        children: [
          {
            path: 'list',
            component: ListarTramiteComponent,
          },
        ],
      },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RecepcionRoutingModule { }
