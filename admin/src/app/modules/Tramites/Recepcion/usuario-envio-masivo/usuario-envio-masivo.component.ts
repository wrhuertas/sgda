import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { RecepcionService } from '../service/recepcion.service';

@Component({
  selector: 'app-usuario-envio-masivo',
  templateUrl: './usuario-envio-masivo.component.html',
  styleUrls: ['./usuario-envio-masivo.component.scss']
})
export class UsuarioEnvioMasivoComponent {


    @Input() id_usuario: any;
    @Input() id_empresa: any;
    @Input() id_tipo_documento: any;
    @Input() nombre_tipo_documento: any;
    @Input() personasIniciales: any[] | null = null; // Lista que llega desde el padre (para/cc/de)
  
    public filtro_usuario: string = '';
    public cargando: boolean = false;
    public usuarios_encontrados: any[] = [];
  
    @Output() tramiteC = new EventEmitter<void>();
    @Output() usuariosAsignados = new EventEmitter<any[]>();
    personas_en_lista: any[] = [];
    
    constructor(
      public activeModal: NgbActiveModal,
      private recepcionService: RecepcionService,
      private cdr: ChangeDetectorRef,
      public toast: ToastrService
    ) {}
  
    ngOnInit(): void {
      console.log("=== BUSCAR USUARIO: DATOS RECIBIDOS ===");
      console.log("ID Usuario Logueado:", this.id_usuario);
      console.log("ID Empresa:", this.id_empresa);
      console.log("Tipo Doc:", this.id_tipo_documento);
      console.log("========================================");
  
      // Si llegan personas iniciales desde el padre, las usamos como base
      if (Array.isArray(this.personasIniciales) && this.personasIniciales.length > 0) {
        // Clonar para no mutar la referencia original
        this.personas_en_lista = this.personasIniciales.map(p => ({ ...p }));
        // Asegurar que el usuario logueado esté con rol DE y lockedRole=true
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const id = this.id_usuario ?? user?.id;
        if (id) {
          const idx = this.personas_en_lista.findIndex(u => u.id === id);
          if (idx >= 0) {
            this.personas_en_lista[idx].rol_envio = 'DE';
            this.personas_en_lista[idx].lockedRole = true;
            this.personas_en_lista[idx].tiene_firma = !!user?.archivo_firma;
          } else {
            // Si no está, lo añadimos como DE fijo
            const base: any = {
              id,
              nombre_completo: String(
                user?.nombre_completo || user?.full_name || `${user?.name ?? ''} ${user?.surname ?? ''}`.trim()
              ).trim() || 'Usuario',
              n_document: user?.n_document ?? '',
              email: user?.email ?? '',
              empresa: '',
              proyecto: 'N/A',
              titulo: String(user?.titulo || user?.title || user?.cargo || user?.puesto || '').trim() || null,
              subseccion: String(
                user?.subseccion || user?.subseccion_nombre || user?.area_nombre || user?.nombre_area || user?.departamento || user?.seccion || ''
              ).trim() || 'N/A',
              id_proyecto: user?.id_proyecto ?? null,
              rol_envio: 'DE',
              lockedRole: true,
              tiene_firma: !!user?.archivo_firma,
            };
            this.personas_en_lista = [base, ...this.personas_en_lista];
          }
        }
        this.cdr.detectChanges();
      } else {
        // Flujo anterior: crear DE fijo del logueado
        this.inicializarUsuarioDe();
      }
  
      // ✅ Cargar automáticamente usuarios de recepción de la empresa
      this.buscarUsuarios();
    }
  
    private inicializarUsuarioDe() {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const id = this.id_usuario ?? user?.id;
      if (!id) return;
  
      const existe = this.personas_en_lista.find(u => u.id === id);
      if (existe) {
        existe.rol_envio = 'DE';
        existe.lockedRole = true;
        existe.tiene_firma = !!user?.archivo_firma;
        this.cdr.detectChanges();
        return;
      }
  
      const base: any = {
        id,
        nombre_completo: String(
          user?.nombre_completo ||
            user?.full_name ||
            `${user?.name ?? ''} ${user?.surname ?? ''}`.trim() ||
            `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim() ||
            `${user?.nombres ?? ''} ${user?.apellidos ?? ''}`.trim()
        ).trim() || 'Usuario',
        n_document: user?.n_document ?? '',
        email: user?.email ?? '',
        empresa: '',
        proyecto: 'N/A',
        titulo: String(user?.titulo || user?.title || user?.cargo || user?.puesto || '').trim() || null,
        subseccion: String(
          user?.subseccion ||
            user?.subseccion_nombre ||
            user?.area_nombre ||
            user?.nombre_area ||
            user?.departamento ||
            user?.seccion ||
            ''
        ).trim() || 'N/A',
        id_proyecto: user?.id_proyecto ?? null,
        rol_envio: 'DE',
        lockedRole: true,
        tiene_firma: !!user?.archivo_firma,
      };
  
      this.personas_en_lista = [base, ...this.personas_en_lista];
  
      const idEmpresa = this.id_empresa ?? user?.id_empresa;
      if (idEmpresa) {
        this.recepcionService.cargarempresaid(Number(idEmpresa)).subscribe({
          next: (empresa: any) => {
            base.empresa = empresa?.nombre_empresa || base.empresa || 'Sin Empresa';
            this.cdr.detectChanges();
          },
          error: () => this.cdr.detectChanges()
        });
      } else {
        this.cdr.detectChanges();
      }
    }
    buscarUsuarios() {
      this.cargando = true;
      this.usuarios_encontrados = [];
    
      // Solo envía id_empresa, obtiene todos los usuarios de recepción de esa empresa
      this.recepcionService.buscarUsuariosSistema(
        '', // Sin filtro de búsqueda
        this.id_empresa, 
        this.id_usuario
      ).subscribe({
        next: (resp: any) => {
          this.usuarios_encontrados = resp.usuarios || [];
          this.cargando = false;
          
          if (this.usuarios_encontrados.length === 0) {
            this.toast.info('No se encontraron usuarios de recepción en esta empresa');
          }
    
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("Error en búsqueda:", err);
          this.cargando = false;
          Swal.fire('Error', 'Ocurrió un problema al conectar con el servidor', 'error');
        }
      });
    }
  
  
  agregarALaTabla(user: any) {
      const existe = this.personas_en_lista.find(u => u.id === user.id);
      
      if (!existe) {
          const logged = JSON.parse(localStorage.getItem('user') || '{}');
          const loggedId = this.id_usuario ?? logged?.id ?? null;
  
          const toAdd: any = { ...user };
          if (!toAdd.rol_envio) {
            toAdd.rol_envio = (loggedId && toAdd.id === loggedId) ? 'DE' : 'PARA';
          }
           this.personas_en_lista.push(toAdd);
           // Quitar el usuario de los resultados encontrados para que no aparezca como duplicado
           this.usuarios_encontrados = this.usuarios_encontrados.filter(u => u.id !== toAdd.id);
      }
      // Nota: no limpiamos el filtro_usuario para permitir añadir varios usuarios sin reescribir la búsqueda
      this.cdr.detectChanges();
  }
  
    cerrar() {
      this.activeModal.dismiss();
    }
  
  
  
    enviarSeleccion() {
      if (this.personas_en_lista.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Lista vacía',
          text: 'Debe agregar al menos una persona antes de continuar.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
    
      const incompletos = this.personas_en_lista.filter(p => !p.rol_envio);
      
      if (incompletos.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Faltan roles',
          text: 'Por favor, seleccione el rol (Para, De o Copia) para todos los usuarios en la lista.',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#f27474'
        });
        return;
      }
  
      const deFijos = this.personas_en_lista.filter(p => p.rol_envio === 'DE');
      const deNoFijo = this.personas_en_lista.filter(p => p.rol_envio === 'DE' && p.lockedRole !== true);
      if (deFijos.length !== 1 || deNoFijo.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Rol "De" inválido',
          text: 'El rol "De" corresponde únicamente al usuario logeado y no se puede modificar.',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#f27474'
        });
        return;
      }
    
      const data_para_enviar = this.personas_en_lista.map(p => ({
          id_usuario: p.id,
          rol: p.rol_envio,
          tiene_firma: p.tiene_firma
      }));
  
      try {
        const cntPara = this.personas_en_lista.filter(p => p.rol_envio === 'PARA').length;
        const cntDe = this.personas_en_lista.filter(p => p.rol_envio === 'DE').length;
        const cntCopia = this.personas_en_lista.filter(p => p.rol_envio === 'COPIA').length;
        console.log('[Recepcion/BuscarUsuario] EnviarSeleccion -> PARA:', cntPara, 'DE:', cntDe, 'COPIA:', cntCopia);
      } catch {}
  
      this.usuariosAsignados.emit(this.personas_en_lista);
    }
  
    limpiarLista() {
      this.personas_en_lista = this.personas_en_lista.filter(p => p.lockedRole === true);
      this.cdr.detectChanges();
    }
  
    // Log de cambio de rol para depurar cuándo se marca "PARA"
    onRolChange(p: any) {
      try {
        console.log('[Recepcion/BuscarUsuario] Rol cambiado:', p?.nombre_completo || p?.id, '->', p?.rol_envio);
        if (p?.rol_envio === 'PARA') {
          console.log('[Recepcion/BuscarUsuario] Seleccionado como PARA:', p);
        }
      } catch {}
    }

}
