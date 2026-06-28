import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { DespachoService } from '../service/despacho.service';

@Component({
  selector: 'app-usuario-area',
  templateUrl: './usuario-area.component.html',
  styleUrls: ['./usuario-area.component.scss']
})
export class UsuarioAreaComponent implements OnInit {

  @Input() id_area!: number;

  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  search: string = '';
  usuariosSeleccionados: { id: number, nombre: string }[] = [];


  constructor(
    public activeModal: NgbActiveModal,
    private DespachoService: DespachoService,
    private toast: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.usuariosporare(this.id_area);
  }

  usuariosporare(id_area: number) {
    this.DespachoService.usuariosPorArea(id_area).subscribe({
      next: (resp: any) => {
        this.usuarios = resp.usuarios;
        this.usuariosFiltrados = resp.usuarios;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('No se pudo cargar usuarios');
      }
    });
  }

  filtrarUsuarios() {
    const texto = this.search.toLowerCase();
    this.usuariosFiltrados = this.usuarios.filter(u =>
      `${u.name} ${u.surname}`.toLowerCase().includes(texto)
    );
  }

  isUsuarioSeleccionado(user: any): boolean {
  return !!this.usuariosSeleccionados.find(u => u.id === user.id);
}

toggleUsuario(user: any, event: any) {
  const checked = event.target.checked;
  if (checked) {
    if (!this.isUsuarioSeleccionado(user)) {
      this.usuariosSeleccionados.push({ id: user.id, nombre: `${user.name} ${user.surname}` });
    }
  } else {
    this.usuariosSeleccionados = this.usuariosSeleccionados.filter(u => u.id !== user.id);
  }
}



  confirmarSeleccion() {
    console.log('Usuarios seleccionados:', this.usuariosSeleccionados);
    this.activeModal.close(this.usuariosSeleccionados); // 🚀 enviamos al padre
}



  cerrar() {
    this.activeModal.dismiss();
  }
}
