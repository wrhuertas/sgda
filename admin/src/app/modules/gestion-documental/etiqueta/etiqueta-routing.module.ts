import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EtiquetaComponent } from './etiqueta.component';
import { ListaEtiquetaComponent } from './lista-etiqueta/lista-etiqueta.component';

const routes: Routes = [
  {
    path: '',
    component: EtiquetaComponent,
    children: [
      {
        path: 'list',
        component: ListaEtiquetaComponent
      },
      {
        // Entrar a /etiqueta lleva directo al listado
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EtiquetaRoutingModule { }
