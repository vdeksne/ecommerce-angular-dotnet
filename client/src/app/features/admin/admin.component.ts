import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { Order } from '../../shared/models/order';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AdminService } from '../../core/services/admin.service';
import { OrderParams } from '../../shared/models/orderParams';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatLabel, MatSelectChange, MatSelectModule } from '@angular/material/select';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import {MatTabsModule} from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { DialogService } from '../../core/services/dialog.service';
import { Product } from '../../shared/models/product';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { SnackbarService } from '../../core/services/snackbar.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButton,
    MatIcon,
    MatSelectModule,
    DatePipe,
    CurrencyPipe,
    MatLabel,
    MatTooltipModule,
    MatTabsModule,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  displayedColumns: string[] = ['id', 'buyerEmail', 'orderDate', 'total', 'status', 'action'];
  dataSource = new MatTableDataSource<Order>([]);
  private adminService = inject(AdminService);
  private dialogService = inject(DialogService);
  private snackbar = inject(SnackbarService);
  private fb = inject(FormBuilder);
  orderParams = new OrderParams();
  totalItems = 0;
  statusOptions = ['All', 'PaymentReceived', 'PaymentMismatch', 'Refunded', 'Pending'];

  // Product management properties
  productColumns: string[] = ['id', 'name', 'brand', 'type', 'price', 'quantityInStock', 'action'];
  productDataSource = new MatTableDataSource<Product>([]);
  productForm!: FormGroup;
  showProductForm = false;
  editingProduct: Product | null = null;
  productPageIndex = 0;
  productPageSize = 10;
  productTotalItems = 0;
  brands: string[] = [];
  types: string[] = [];
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  uploadingImage = false;

  ngOnInit(): void {
    this.loadOrders();
    this.loadProducts();
    this.loadBrandsAndTypes();
    this.initProductForm();
  }

  loadOrders() {
    this.adminService.getOrders(this.orderParams).subscribe({
      next: response => {
        if (response.data) {
          this.dataSource.data = response.data;
          this.totalItems = response.count;
        }
      }
    })
  }

  onPageChange(event: PageEvent) {
    this.orderParams.pageNumber = event.pageIndex + 1;
    this.orderParams.pageSize = event.pageSize;
    this.loadOrders();
  }

  onFilterSelect(event: MatSelectChange) {
    this.orderParams.filter = event.value;
    this.orderParams.pageNumber = 1;
    this.loadOrders();
  }

  async openConfirmDialog(id: number) {
    const confirmed = await this.dialogService.confirm(
      'Confirm refund',
      'Are you sure you want to issue this refund? This cannot be undone'
    )

    if (confirmed) this.refundOrder(id);
  }

  refundOrder(id: number) {
    this.adminService.refundOrder(id).subscribe({
      next: order => {
        this.dataSource.data = this.dataSource.data.map(o => o.id === id ? order : o)
      }
    })
  }

  // Product management methods
  initProductForm() {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0.01)]],
      pictureUrl: ['', Validators.required],
      brand: ['', Validators.required],
      type: ['', Validators.required],
      quantityInStock: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadProducts() {
    this.adminService.getProducts(this.productPageIndex + 1, this.productPageSize).subscribe({
      next: response => {
        if (response.data) {
          this.productDataSource.data = response.data;
          this.productTotalItems = response.count;
        }
      },
      error: err => {
        this.snackbar.error('Failed to load products');
      }
    });
  }

  loadBrandsAndTypes() {
    this.adminService.getBrands().subscribe({
      next: brands => this.brands = brands
    });
    this.adminService.getTypes().subscribe({
      next: types => this.types = types
    });
  }

  onProductPageChange(event: PageEvent) {
    this.productPageIndex = event.pageIndex;
    this.productPageSize = event.pageSize;
    this.loadProducts();
  }

  openAddProductForm() {
    this.editingProduct = null;
    this.productForm.reset();
    this.showProductForm = true;
  }

  openEditProductForm(product: Product) {
    this.editingProduct = product;
    this.productForm.patchValue({
      name: product.name,
      description: product.description,
      price: product.price,
      pictureUrl: product.pictureUrl,
      brand: product.brand,
      type: product.type,
      quantityInStock: product.quantityInStock
    });
    this.imagePreview = product.pictureUrl ? product.pictureUrl : null;
    this.showProductForm = true;
  }

  cancelProductForm() {
    this.showProductForm = false;
    this.editingProduct = null;
    this.productForm.reset();
    this.clearImageSelection();
  }

  saveProduct() {
    if (this.productForm.invalid) {
      this.snackbar.error('Please fill in all required fields');
      return;
    }

    const productData = this.productForm.value;

    if (this.editingProduct) {
      // Update existing product
      this.adminService.updateProduct(this.editingProduct.id, { ...this.editingProduct, ...productData }).subscribe({
        next: () => {
          this.snackbar.success('Product updated successfully');
          this.cancelProductForm();
          this.loadProducts();
        },
        error: () => {
          this.snackbar.error('Failed to update product');
        }
      });
    } else {
      // Create new product
      this.adminService.createProduct(productData).subscribe({
        next: () => {
          this.snackbar.success('Product created successfully');
          this.cancelProductForm();
          this.loadProducts();
        },
        error: () => {
          this.snackbar.error('Failed to create product');
        }
      });
    }
  }

  async deleteProduct(id: number) {
    const confirmed = await this.dialogService.confirm(
      'Delete Product',
      'Are you sure you want to delete this product? This cannot be undone.'
    );

    if (confirmed) {
      this.adminService.deleteProduct(id).subscribe({
        next: () => {
          this.snackbar.success('Product deleted successfully');
          this.loadProducts();
        },
        error: () => {
          this.snackbar.error('Failed to delete product');
        }
      });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.snackbar.error('Please select an image file');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.snackbar.error('File size must be less than 5MB');
        return;
      }

      this.selectedFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadImage() {
    if (!this.selectedFile) {
      this.snackbar.error('Please select an image file');
      return;
    }

    this.uploadingImage = true;
    this.adminService.uploadProductImage(this.selectedFile).subscribe({
      next: (response) => {
        // Handle response - API returns { url: string }
        const imageUrl = typeof response === 'string' ? response : (response?.url || '');
        
        if (!imageUrl) {
          this.snackbar.error('No image URL returned from server');
          this.uploadingImage = false;
          return;
        }

        // Update form with the image URL
        this.productForm.patchValue({ pictureUrl: imageUrl });
        
        // Keep the preview showing the uploaded image URL
        // Ensure URL starts with / for relative paths
        this.imagePreview = imageUrl.startsWith('http') || imageUrl.startsWith('/') 
          ? imageUrl 
          : `/${imageUrl}`;
        
        this.snackbar.success('Image uploaded successfully');
        this.selectedFile = null;
        this.uploadingImage = false;
        
        // Reset file input
        setTimeout(() => {
          const fileInput = document.getElementById('imageFileInput') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }, 100);
      },
      error: (err) => {
        console.error('Upload error:', err);
        const errorMessage = err.error?.message || err.error?.title || err.message || 'Failed to upload image';
        this.snackbar.error(errorMessage);
        this.uploadingImage = false;
      }
    });
  }

  selectImageFile() {
    const fileInput = document.getElementById('imageFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  clearImageSelection() {
    this.selectedFile = null;
    this.imagePreview = null;
    // Reset file input if it exists
    setTimeout(() => {
      const fileInput = document.getElementById('imageFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }, 0);
  }
}
