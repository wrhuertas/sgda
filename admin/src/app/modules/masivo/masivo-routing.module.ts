import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MasivoComponent } from './masivo.component';
import { VerMasivoComponent } from './ver-masivo/ver-masivo.component';


const routes: Routes = [
  {
    path:'',
    component: MasivoComponent,
    children: [
      {
        path:'ver',
        component: VerMasivoComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MasivoRoutingModule { }
