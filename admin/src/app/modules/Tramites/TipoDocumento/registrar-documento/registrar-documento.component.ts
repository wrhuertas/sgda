import { Component, EventEmitter, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { TipodocumentoService } from '../service/tipodocumento.service';


@Component({
  selector: 'app-registrar-documento',
  templateUrl: './registrar-documento.component.html',
  styleUrls: ['./registrar-documento.component.scss']
})
export class RegistrarDocumentoComponent {
 nombre: string = '';
  user: any;
  isLoading: boolean = false;
  prioridadId: string = '';

  @Output() TipoDocumentoC = new EventEmitter<any>();

  constructor(
    private authService: AuthService,
    public TipodocumentoService: TipodocumentoService,
    public toast: ToastrService,
    public modal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.user = this.authService.user;
  }

  store() {
    if (!this.user?.id_empresa) {
      this.toast.error('No se encontró la empresa del usuario');
      return;
    }

    const data = {
      nombre: this.nombre,
      prioridad: this.prioridadId,
      id_empresa: this.user.id_empresa,

    };

    this.isLoading = true;

    this.TipodocumentoService.registerTipoDocumento(data).subscribe({
      next: (resp: any) => {
        this.toast.success('Tipo Documento creado correctamente');
         this.TipoDocumentoC.emit(resp.tipodocumento);
        this.modal.close();
      },
      error: () => {
        this.toast.error('Error al crear el proyecto');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  cerrar() {
    this.modal.close();
  }
}
