import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListSubseccion2Component } from './list-subseccion2/list-subseccion2.component';
import { Subseccion2Component } from './subseccion2.component';

const routes: Routes = [
  {
    path: '',
    component: Subseccion2Component,
    children: [
      { path: 'list', component: ListSubseccion2Component }  // sin :idSubseccion
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Subseccion2RoutingModule { }
