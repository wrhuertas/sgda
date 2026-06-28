import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReportesService } from '../../service/reportes.service';
import { VisorPdfComponent } from '../visor-pdf/visor-pdf.component';
import { URL_BACKEND } from 'src/app/config/config';
import Swal from 'sweetalert2';

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
}

interface Actividad {
  id: number;
  nombre: string;
  detalle: string;
  fecha: Date;
}

@Component({
  selector: 'app-ver',
  templateUrl: './ver.component.html',
  styleUrls: ['./ver.component.scss']
})
export class VerComponent implements OnInit {

  

  // 🔹 Filtros
  fechaInicio!: string;      // fecha tipo 'yyyy-MM-dd'
  fechaFin!: string;
  usuarioFiltro: number | null = null;
  actividadFiltro: number | null = null;

  // 🔹 Listas
  usuarios: Usuario[] = [];           // todos los usuarios

  searchUser: string = '';

  actividadesTipos: {id: number, nombre: string}[] = [];  // tipos de actividad
  // Variable para el usuario seleccionado
usuarioSeleccionado: any = null;

// Todas las actividades
actividades: any[] = []; 

// Actividades filtradas según el usuario seleccionado
actividadesFiltradas: any[] = []; 

usuariosFiltrados: any[] = [];

auditoriaUsuario: any[] = [];
  auditoriaRaw: any[] = [];
  ultimoFiltrosAplicados: any | null = null;

  // Paginación simulada
  currentPage: number = 1;
  totalPages: number = 1;

  userId: number = 0;
  id_empresa: any = null;

  constructor(
      public modalService: NgbModal,
      public ReporteService: ReportesService,
       private cdr: ChangeDetectorRef,
      private router: Router
    ) { }

  ngOnInit(): void {
const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (user && user.id_empresa != null) {
    this.id_empresa = user.id_empresa;
  }
    this.enviarUsuarioAlServicio();
    this.cargarIdEmpresaUsuario();
    
  }
  


onUsuarioChange() {
  // Si el usuario selecciona "Todos" (null), limpiamos el select de actividades
  if (!this.usuarioFiltro) {
    this.actividadesTipos = [];
    this.actividadFiltro = null;
    return;
  }

  // Si selecciona un ID específico (ej: 135), buscamos sus acciones únicas en la tabla auditorias
  this.ReporteService.getActividadesUnicas(this.usuarioFiltro).subscribe({
    next: (res: any) => {
      // res.actividades viene de Laravel con el DISTINCT aplicado
      console.log('Actividades únicas del usuario:', res.actividades);
      this.actividadesTipos = res.actividades;
      this.actividadFiltro = null; // Reset de la actividad seleccionada
    },
    error: (err) => {
      console.error('Error al traer actividades', err);
      this.actividadesTipos = [];
    }
  });
}



cargarIdEmpresaUsuario() {
  // 1. Sacamos el usuario del storage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // 2. Validamos que exista el id_empresa
  if (user && user.id_empresa) {
    this.id_empresa = user.id_empresa;

    // 3. MANDAMOS EL ID AL SERVICIO
    this.ReporteService.getAuditoriaPorEmpresa(this.id_empresa).subscribe({
  next: (res: any) => {
    console.log('Respuesta de Usuarios desde Laravel:', res);
    // Asignamos el array que viene dentro del objeto 'res'
    this.usuarios = res.usuarios;
    
    // Esto es para que el filtro de búsqueda lateral funcione de inmediato
    this.usuariosFiltrados = [...this.usuarios]; 
  },
  error: (err) => {
    console.error('Error cargando usuarios', err);
  }
});

  } else {
    // Si no hay id_empresa en el storage, mandamos el error
    Swal.fire('Error de Sesión', 'No se encontró el ID de la empresa en el storage.', 'error');
  }
}


   // 🔹 Función separada para enviar el ID del usuario
 enviarUsuarioAlServicio(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (user.id) {
      this.ReporteService.setUsuarioId(user.id).subscribe({
        next: (res: any) => {
          console.log('Respuesta del backend:', res);

          if (res.success && res.usuarios) {
            this.usuariosFiltrados = res.usuarios.map((u: any) => ({
              id: u.id,
              nombre: u.name + ' ' + (u.surname || ''),
              correo: u.email
            }));

            // ✅ Forzar que Angular actualice la vista
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('Error al enviar el ID del usuario:', err);
        }
      });

      console.log('ID usuario enviado al servicio:', user.id);
    } else {
      console.warn('No hay usuario en localStorage');
    }
  }


  // 🔹 Función para seleccionar un usuario
  // Función que se llama al hacer clic
seleccionarUsuario(user: any) {
  this.usuarioSeleccionado = user;
  this.ultimoFiltrosAplicados = null;
  console.log('Usuario seleccionado:', user);

  // 🔹 Llamar al servicio para traer auditoría
  this.ReporteService.getAuditoriaUsuario(user.id).subscribe({
    next: (res: any) => {
      console.log('Auditoría del usuario:', res);

      if (res.success && res.auditoria) {
        this.auditoriaRaw = Array.isArray(res.auditoria) ? res.auditoria : [];

        this.actividadesFiltradas = this.auditoriaRaw.map((a: any) => ({
          id: a.id ?? null,
          nombre: a.accion ?? a.nombre ?? '',
          detalle: a.detalle ?? '',
          detalle2: a.detalle2 ?? '',
          documentos: a.documentos ?? '',
          fecha: a.created_at ?? a.fecha ?? null,
          modulo: a.modulo ?? '',
          accion: a.accion ?? '',
          usuario: a.usuario ?? null,
        }));

        this.cdr.detectChanges(); // 🔹 Forzar refresco de la vista
      } else {
        this.auditoriaRaw = [];
        this.actividadesFiltradas = [];
      }
    },
    error: (err) => {
      console.error('Error al obtener auditoría:', err);
      this.auditoriaRaw = [];
      this.actividadesFiltradas = [];
    }
  });
}


// Función para enviar el ID al servicio y traer auditoría
obtenerAuditoriaUsuario(userId: string) {
  this.ReporteService.getAuditoriaUsuario(userId).subscribe({
    next: (res: any) => {
      console.log('Auditoría del usuario:', res);
      this.auditoriaUsuario = res.auditoria || []; // Suponiendo que el backend devuelve { auditoria: [...] }
      this.cdr.detectChanges(); // Forzar refresco de la vista
    },
    error: (err) => {
      console.error('Error al obtener auditoría:', err);
    }
  });
}

aplicarFiltros() {
  // 1. Validación de Empresa
  if (!this.id_empresa) {
    Swal.fire('Error', 'No se identificó la empresa.', 'error');
    return;
  }

  // 2. Prioridad: Validación de Fechas Obligatorias
  if (!this.fechaInicio || !this.fechaFin) {
    Swal.fire({
      icon: 'warning',
      title: 'Fechas requeridas',
      text: 'Debe seleccionar un rango de fechas (Inicio y Fin) para continuar.',
      confirmButtonColor: '#3085d6'
    });
    return;
  }

  // 3. Validación de Rango Lógico
  if (new Date(this.fechaFin) < new Date(this.fechaInicio)) {
    Swal.fire('Error', 'La fecha fin no puede ser menor a la de inicio', 'error');
    return;
  }

  // 4. Armado de Filtros
  const filtros = {
    empresa_id: this.id_empresa,
    user_id: this.usuarioFiltro || "TODOS", 
    actividad_id: this.actividadFiltro || "TODOS",
    fecha_inicio: this.fechaInicio,
    fecha_fin: this.fechaFin
  };

  // 5. Mostrar Cargando
  Swal.fire({
    title: 'Buscando registros',
    text: 'Por favor espere...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  // 6. Llamada al Servicio
  this.ReporteService.getAuditoriaFiltrada(filtros).subscribe({
    next: (res: any) => {
      Swal.close(); // Cerramos el loading inmediatamente

      const datos = Array.isArray(res) ? res : (res.data || []);
      
      if (datos.length === 0) {
        this.auditoriaRaw = [];
        this.actividadesFiltradas = []; 
        Swal.fire({
          icon: 'info',
          title: 'Sin resultados',
          text: 'No se encontraron datos para el rango seleccionado.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }

      this.ultimoFiltrosAplicados = filtros;
      this.auditoriaRaw = datos;

      this.actividadesFiltradas = datos.map((a: any) => ({
        id: a.id ?? null,
        nombre: a.accion ?? a.nombre ?? '',
        detalle: a.detalle ?? '',
        detalle2: a.detalle2 ?? '',
        documentos: a.documentos ?? '',
        fecha: a.created_at ?? a.fecha ?? null,
        modulo: a.modulo ?? '',
        accion: a.accion ?? '',
        usuario: a.usuario ?? null,
      }));
      this.cdr.detectChanges();
    },
    error: (err) => {
      Swal.close(); 
      console.error('Error al filtrar:', err);
      this.auditoriaRaw = [];
      this.actividadesFiltradas = []; 
      Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
    }
  });
}

// Función para el botón de descarga
descargarReporte(formato: 'pdf' | 'excel') {
  if (this.actividadesFiltradas.length === 0) {
    Swal.fire('Error', 'No hay datos para exportar', 'error');
    return;
  }

  Swal.fire({
    title: 'Generando reporte',
    text: 'Espere un momento...',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  const payloadFiltros =
    this.ultimoFiltrosAplicados ??
    (this.id_empresa
      ? {
          empresa_id: this.id_empresa,
          user_id: this.usuarioFiltro || (this.usuarioSeleccionado?.id ?? 'TODOS'),
          actividad_id: this.actividadFiltro || 'TODOS',
          fecha_inicio: this.fechaInicio || null,
          fecha_fin: this.fechaFin || null,
        }
      : null);

  const payload: any = payloadFiltros ?? this.auditoriaRaw;

  this.ReporteService.exportarAuditoria(payload, formato).subscribe({
    next: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const extension = formato === 'pdf' ? 'pdf' : 'xlsx';
      
      a.href = url;
      a.download = `reporte_auditoria_${new Date().getTime()}.${extension}`;
      a.click();
      
      window.URL.revokeObjectURL(url);
      Swal.close();
      Swal.fire('Éxito', 'Reporte generado correctamente', 'success');
    },
    error: (err) => {
      console.error(err);
      Swal.close();
      Swal.fire('Error', 'No se pudo generar el reporte', 'error');
    }
  });
}

  loadPage(page: number) {
     if (page < 1 || page > this.totalPages) return;
     this.currentPage = page;
     // Si quieres, aquí llamas al backend para paginar
  }

  // 🔹 Función para abrir el visor de PDF
  abrirVisorPDF(actividad: any, nombreDocumento: string) {
    if (!nombreDocumento || nombreDocumento.trim() === '') {
      Swal.fire('Error', 'No hay documento para visualizar', 'error');
      return;
    }

    // Extraer la ruta de detalle2 usando regex
    // Formato: "ID Documento: 7575 | Tiempo trabajado: 13s | Ruta: documentos/..."
    let rutaDocumento = nombreDocumento;
    
    if (actividad && actividad.detalle2) {
      const match = actividad.detalle2.match(/Ruta:\s*(.+?)(?:\s*\||$)/);
      if (match && match[1]) {
        rutaDocumento = match[1].trim();
      }
    }

    // Construir la URL del documento usando URL_BACKEND
    // La ruta viene de detalle2 como: documentos/2-empresa/...
    let url = '';
    if (rutaDocumento.startsWith('http')) {
      url = rutaDocumento;
    } else {
      // Agregar "storage/" si la ruta comienza con "documentos/"
      const rutaConStorage = rutaDocumento.startsWith('documentos/') 
        ? `storage/${rutaDocumento}` 
        : rutaDocumento;
      url = `${URL_BACKEND}${rutaConStorage}`;
    }
    
    console.log('URL del PDF:', url);
    console.log('URL_BACKEND:', URL_BACKEND);
    console.log('Ruta extraída:', rutaDocumento);
    console.log('Detalle2:', actividad?.detalle2);
    
    // Abrir el visor en un modal
    const modalRef = this.modalService.open(VisorPdfComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static',
      windowClass: 'modal-fullscreen-md'
    });

    modalRef.componentInstance.urlPdf = url;
    modalRef.componentInstance.nombreArchivo = nombreDocumento;
  }

  descargarDocumento(nombreDocumento: string) {
    if (!nombreDocumento || nombreDocumento.trim() === '') {
      Swal.fire('Error', 'No hay documento para descargar', 'error');
      return;
    }

    // Aquí puedes abrir el documento o descargarlo
    // Ajusta la ruta según donde guardes los documentos
    const url = `storage/documentos/${nombreDocumento}`;
    window.open(url, '_blank');
  }









}
