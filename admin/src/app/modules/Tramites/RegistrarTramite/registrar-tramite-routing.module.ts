import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegistrarTramiteComponent } from './registrar-tramite.component';
import { RegistrarComponent } from './registrar/registrar.component';


const routes: Routes = [

  {
        path: '',
        component: RegistrarTramiteComponent,
        children: [
          {
            path: 'registrar',
            component: RegistrarComponent,
          },
        ],
      },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RegistrarTramiteRoutingModule { }
