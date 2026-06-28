import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocumentosComponent } from './documentos.component';
import { ListDocumentosComponent } from './list-documentos/list-documentos.component';

const routes: Routes = [
  {
    path: '',
    component: DocumentosComponent,
    children: [
      {
        path: 'list',
        component: ListDocumentosComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DocumentosRoutingModule { }
