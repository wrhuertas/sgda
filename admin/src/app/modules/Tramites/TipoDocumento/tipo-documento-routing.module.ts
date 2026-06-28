import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TipoDocumentoComponent } from './tipo-documento.component';
import { ListarDocumentoComponent } from './listar-documento/listar-documento.component';

const routes: Routes = [
   {
        path: '',
        component: TipoDocumentoComponent,
        children: [
          {
            path: 'list',
            component: ListarDocumentoComponent,
          },
        ],
      },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TipoDocumentoRoutingModule { }
