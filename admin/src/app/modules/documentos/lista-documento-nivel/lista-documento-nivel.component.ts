import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-lista-documento-nivel',
  template: `
    <ul>
      <li *ngFor="let documento of documentos">
        <span class="document-name">{{ documento.nombre }}</span>
        <ng-container *ngIf="documento.subsecciones && documento.subsecciones.length > 0">
          <app-lista-documento-nivel [documentos]="documento.subsecciones"></app-lista-documento-nivel>
        </ng-container>
      </li>
    </ul>
  `,
  styleUrls: ['./lista-documento-nivel.component.scss']
})
export class ListaDocumentoNivelComponent {
  @Input() documentos: any[] = [];
}