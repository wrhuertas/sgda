import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProductsService } from '../service/products.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-delete-product',
  templateUrl: './delete-product.component.html',
  styleUrls: ['./delete-product.component.scss']
})
export class DeleteProductComponent {

  @Output() ProductD: EventEmitter<any> = new EventEmitter();
  @Input()  PRODUCT_SELECTED:any;

  isLoading:any;
  constructor(
    public modal: NgbActiveModal,
    public produtService: ProductsService,
    public toast: ToastrService,
  ) {
    
  }

  ngOnInit(): void {
  }

  delete(){
    
    this.produtService.deleteProduct(this.PRODUCT_SELECTED.id).subscribe((resp:any) => {
      console.log(resp);
      if(resp.message == 403){
        this.toast.error("Validación",resp.message_text);
      }else{
        this.toast.success("Exito","El cliente se elimino correctamente");
        this.ProductD.emit(resp.message);
        this.modal.close();
      }
    })
  }

}
