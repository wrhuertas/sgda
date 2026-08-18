import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateSuperUsuarioComponent } from '../create-super-usuario/create-super-usuario.component';
import { EditSuperUsuarioComponent } from '../edit-super-usuario/edit-super-usuario.component';
import { DeleteSuperUsuarioComponent } from '../delete-super-usuario/delete-super-usuario.component';
import { UsersService } from '../../users/service/users.service';

@Component({
  selector: 'app-list-super-usuarios',
  templateUrl: './list-super-usuarios.component.html',
  styleUrls: ['./list-super-usuarios.component.scss']
})
export class ListSuperUsuariosComponent implements OnInit {

  search: string = '';
  superUsuarios: any[] = [];
  cargando: boolean = false;

  constructor(
    private modalService: NgbModal,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarSuperUsuarios();
  }

  cargarSuperUsuarios(): void {
    this.cargando = true;
    this.usersService.listSuperUsuarios(this.search).subscribe({
      next: (resp: any) => {
        this.superUsuarios = resp?.users || [];
        this.cargando = false;
        try { this.cdr.detectChanges(); } catch {}
      },
      error: () => {
        this.superUsuarios = [];
        this.cargando = false;
        try { this.cdr.detectChanges(); } catch {}
      }
    });
  }

  buscar(): void {
    this.cargarSuperUsuarios();
  }

  crearSuperUsuario(): void {
    const modalRef = this.modalService.open(CreateSuperUsuarioComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });
    modalRef.componentInstance.SuperUsuarioC?.subscribe((nuevo: any) => {
      if (nuevo) {
        this.superUsuarios.unshift(nuevo);
        try { this.cdr.detectChanges(); } catch {}
      }
    });
  }

  editarSuperUsuario(usuario: any): void {
    const modalRef = this.modalService.open(EditSuperUsuarioComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });
    modalRef.componentInstance.SUPER_USUARIO_SELECTED = usuario;
    modalRef.componentInstance.SuperUsuarioE?.subscribe((editado: any) => {
      if (!editado) { return; }
      const i = this.superUsuarios.findIndex((u: any) => u.id === editado?.id);
      if (i !== -1) {
        this.superUsuarios[i] = editado;
        try { this.cdr.detectChanges(); } catch {}
      }
    });
  }

  eliminarSuperUsuario(usuario: any): void {
    const modalRef = this.modalService.open(DeleteSuperUsuarioComponent, {
      centered: true,
      backdrop: 'static'
    });
    modalRef.componentInstance.SUPER_USUARIO_SELECTED = usuario;
    modalRef.componentInstance.SuperUsuarioD?.subscribe((idEliminado: any) => {
      if (!idEliminado) { return; }
      this.superUsuarios = this.superUsuarios.filter((u: any) => u.id !== idEliminado);
      try { this.cdr.detectChanges(); } catch {}
    });
  }
}
