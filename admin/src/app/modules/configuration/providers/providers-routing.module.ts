import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProvidersComponent } from './providers.component';
import { ListsProvidersComponent } from './lists-providers/lists-providers.component';

const routes: Routes = [
  {
    path: '',
    component:ProvidersComponent,
    children: [
      {
        path:'list',
        component: ListsProvidersComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProvidersRoutingModule { }
