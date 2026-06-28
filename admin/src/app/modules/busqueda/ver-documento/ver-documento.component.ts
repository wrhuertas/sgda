import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-ver-documento',
  templateUrl: './ver-documento.component.html',
  styleUrls: ['./ver-documento.component.scss']
})
export class VerDocumentoComponent implements OnInit {
  @Input() rutaDocumento!: string;
  public urlSegura!: SafeResourceUrl;

  constructor(
    public activeModal: NgbActiveModal,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // ✅ Convertir la URL a SafeResourceUrl directamente
    this.urlSegura = this.sanitizer.bypassSecurityTrustResourceUrl(this.rutaDocumento);
  }
}
