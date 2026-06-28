import { Component } from '@angular/core';
import { WarehouseService } from '../service/warehouse.service';
import { CreateWherehouseComponent } from '../create-wherehouse/create-wherehouse.component';
import { EditWherehouseComponent } from '../edit-wherehouse/edit-wherehouse.component';
import { DeleteWherehouseComponent } from '../delete-wherehouse/delete-wherehouse.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-list-wherehouse',
  templateUrl: './list-wherehouse.component.html',
  styleUrls: ['./list-wherehouse.component.scss']
})
export class ListWherehouseComponent {

  search:string = '';
  WAREHOUSES:any = [];
  SUCURSALES:any = [];
  isLoading$:any;

  totalPages:number = 0;
  currentPage:number = 1;
  constructor(
    public modalService: NgbModal,
    public warehouseService: WarehouseService,
  ) {
    
  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.isLoading$ = this.warehouseService.isLoading$;
    this.listWarehouses();
  }

  listWarehouses(page = 1){
    this.warehouseService.listWarehouses(page,this.search).subscribe((resp:any) => {
      console.log(resp);
      this.WAREHOUSES = resp.warehouses;
      this.totalPages = resp.total;
      this.currentPage = page;
      this.SUCURSALES = resp.sucursales;
    })
  }

  loadPage($event:any){
    this.listWarehouses($event);
  }

  createWarehouse(){
    const modalRef = this.modalService.open(CreateWherehouseComponent,{centered:true, size: 'md'});
    modalRef.componentInstance.SUCURSALES = this.SUCURSALES;

    modalRef.componentInstance.WareHouseC.subscribe((warehouse:any) => {
      this.WAREHOUSES.unshift(warehouse);
    })
  }

  editWarehouse(WAREHOUSE:any){
    const modalRef = this.modalService.open(EditWherehouseComponent,{centered:true, size: 'md'});
    modalRef.componentInstance.WAREHOUSE_SELECTED = WAREHOUSE;
    modalRef.componentInstance.SUCURSALES = this.SUCURSALES;

    modalRef.componentInstance.WareHouseE.subscribe((warehouse:any) => {
      let INDEX = this.WAREHOUSES.findIndex((sucurs:any) => sucurs.id == WAREHOUSE.id);
      if(INDEX != -1){
        this.WAREHOUSES[INDEX] = warehouse;
      }
    })
  }

  deleteWarehouse(WAREHOUSE:any){
    const modalRef = this.modalService.open(DeleteWherehouseComponent,{centered:true, size: 'md'});
    modalRef.componentInstance.WAREHOUSE_SELECTED = WAREHOUSE;

    modalRef.componentInstance.WareHouseD.subscribe((sucursal:any) => {
      let INDEX = this.WAREHOUSES.findIndex((sucurs:any) => sucurs.id == WAREHOUSE.id);
      if(INDEX != -1){
        this.WAREHOUSES.splice(INDEX,1);
      }
    })
  }

}
