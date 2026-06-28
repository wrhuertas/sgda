import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { HistorialtramiteService as RecepcionService } from '../service/historialtramite.service';

@Component({
  selector: 'app-ver-datos',
  templateUrl: './ver-datos.component.html',
  styleUrls: ['./ver-datos.component.scss']
})
export class VerDatosComponent {

    @Input() id_tramite!: number;
  @Input() tramiteDatos!: any;
  @Output() tramiteC = new EventEmitter<void>();
  @Input() areas: any[] = [];
  tramite: any = null;
  cargando: boolean = false;


   constructor(public activeModal: NgbActiveModal,
       public recepcionService: RecepcionService,
       public toast: ToastrService,
           private cdr: ChangeDetectorRef,
           public authService: AuthService,
            public modalService: NgbModal,
    ) {}

     ngOnInit() {
       console.log('ID TRÁMITE RECIBIDO para ver :', this.id_tramite);
        this.datosTramite(this.id_tramite);
      }

      
      datosTramite(id_tramite: number) {
        this.cargando = true;
        this.recepcionService.datosTramite(id_tramite).subscribe({
          next: (resp: any) => {
            console.log('📦 Respuesta del API:', resp);

            this.tramite = resp?.tramite ?? resp?.data ?? resp;
            this.cargando = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error cargando trámite:', err);
            this.tramite = this.tramiteDatos ?? null;
            this.cargando = false;
            this.toast.error('No se pudo cargar el trámite');
            this.cdr.detectChanges();
          }
        });
      }


      cerrar() {
        this.activeModal?.close();
      }


}
