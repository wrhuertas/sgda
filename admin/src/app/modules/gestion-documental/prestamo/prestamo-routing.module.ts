import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListPrestamoComponent } from './list-prestamo/list-prestamo.component';
import { PrestamoComponent } from './prestamo.component';

const routes: Routes = [
  {
        path: '',
        component: PrestamoComponent,
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'list' },
          {
            path: 'list',
            component: ListPrestamoComponent  // <-- Aquí se carga lista por defecto
          }
        ]
      }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PrestamoRoutingModule { }
