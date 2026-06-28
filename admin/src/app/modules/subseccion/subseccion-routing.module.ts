import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SubseccionComponent } from './subseccion.component';
import { ListSubseccionComponent } from './list-subseccion/list-subseccion.component';

const routes: Routes = [
  {
    path: '',
    component: SubseccionComponent,
    children: [
      {
        path: 'list',
        component: ListSubseccionComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SubseccionRoutingModule { }
