import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SeguimientoComponent } from './seguimiento.component';
import { SeguimientoTramiteComponent } from './seguimiento-tramite/seguimiento-tramite.component';

const routes: Routes = [
 {
        path: '',
        component: SeguimientoComponent,
        children: [
          {
            path: 'seguimiento',
            component: SeguimientoTramiteComponent,
          },
        ],
      },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SeguimientoRoutingModule { }
