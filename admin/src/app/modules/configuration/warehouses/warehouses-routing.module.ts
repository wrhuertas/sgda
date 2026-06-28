import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WarehousesComponent } from './warehouses.component';
import { ListWherehouseComponent } from './list-wherehouse/list-wherehouse.component';

const routes: Routes = [
  {
    path: '',
    component: WarehousesComponent,
    children: [
      {
        path: 'list',
        component: ListWherehouseComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WarehousesRoutingModule { }
