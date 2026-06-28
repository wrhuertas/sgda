import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListSubseccion1Component } from './list-subseccion1/list-subseccion1.component';
import { Subseccion1Component } from './subseccion1.component';

// RoutingModule de Subseccion1Module
const routes: Routes = [
  {
    path: '',
    component: Subseccion1Component,
    children: [
      { path: 'list', component: ListSubseccion1Component }  // sin :idSubseccion
    ]
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Subseccion1RoutingModule { }
