import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SuperUsuariosComponent } from './super-usuarios.component';
import { ListSuperUsuariosComponent } from './list-super-usuarios/list-super-usuarios.component';

const routes: Routes = [
  {
    path: '',
    component: SuperUsuariosComponent,
    children: [
      {
        path: 'list',
        component: ListSuperUsuariosComponent
      },
      { path: '', redirectTo: 'list', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SuperUsuariosRoutingModule {}
