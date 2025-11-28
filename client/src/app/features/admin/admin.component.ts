import {
  AfterViewInit,
  Component,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Order } from '../../shared/models/order';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { AdminService } from '../../core/services/admin.service';
import { OrderParams } from '../../shared/models/orderParams';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatLabel,
  MatSelectChange,
  MatSelectModule,
} from '@angular/material/select';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { DialogService } from '../../core/services/dialog.service';
import { Product } from '../../shared/models/product';
import {
  ArchiveImage,
  CreateArchiveImageDto,
  UpdateArchiveImageDto,
} from '../../shared/models/archive-image';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule, MatError } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { SnackbarService } from '../../core/services/snackbar.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { getImageUrl } from '../../shared/utils/image-url.util';
import { FormsModule } from '@angular/forms';

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
    MatProgressSpinnerModule,
    MatError,
    MatCheckboxModule,
    DragDropModule,
    FormsModule,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  displayedColumns: string[] = [
    'id',
    'buyerEmail',
    'orderDate',
    'total',
    'status',
    'action',
  ];
  dataSource = new MatTableDataSource<Order>([]);
  private adminService = inject(AdminService);
  private dialogService = inject(DialogService);
  private snackbar = inject(SnackbarService);
  private fb = inject(FormBuilder);
  orderParams = new OrderParams();
  totalItems = 0;
  statusOptions = [
    'All',
    'PaymentReceived',
    'PaymentMismatch',
    'Refunded',
    'Pending',
  ];

  // Product management properties
  productColumns: string[] = [
    'select',
    'id',
    'name',
    'brand',
    'type',
    'price',
    'quantityInStock',
    'action',
  ];
  productDataSource = new MatTableDataSource<Product>([]);
  selectedProducts = new Set<number>();
  productForm!: FormGroup;
  showProductForm = false;
  editingProduct: Product | null = null;
  useCustomSize = false;

  // Common artwork sizes in cm (16:9 focused)
  readonly commonSizes: {
    label: string;
    width: number;
    height: number;
    aspectRatio: string;
  }[] = [
    {
      label: '40.6 cm x 22.9 cm (16:9)',
      width: 40.6,
      height: 22.9,
      aspectRatio: '16:9',
    },
    {
      label: '61 cm x 34.3 cm (16:9)',
      width: 61,
      height: 34.3,
      aspectRatio: '16:9',
    },
    {
      label: '81.3 cm x 45.7 cm (16:9)',
      width: 81.3,
      height: 45.7,
      aspectRatio: '16:9',
    },
    {
      label: '101.6 cm x 57.2 cm (16:9)',
      width: 101.6,
      height: 57.2,
      aspectRatio: '16:9',
    },
    {
      label: '121.9 cm x 68.6 cm (16:9)',
      width: 121.9,
      height: 68.6,
      aspectRatio: '16:9',
    },
    {
      label: '30.5 cm x 30.5 cm (1:1)',
      width: 30.5,
      height: 30.5,
      aspectRatio: '1:1',
    },
    {
      label: '45.7 cm x 61 cm (3:4)',
      width: 45.7,
      height: 61,
      aspectRatio: '3:4',
    },
    {
      label: '61 cm x 91.4 cm (2:3)',
      width: 61,
      height: 91.4,
      aspectRatio: '2:3',
    },
    {
      label: '76.2 cm x 101.6 cm (3:4)',
      width: 76.2,
      height: 101.6,
      aspectRatio: '3:4',
    },
    { label: 'Custom Size', width: 0, height: 0, aspectRatio: 'custom' },
  ];
  productPageIndex = 0;
  productPageSize = 10;
  productTotalItems = 0;
  brands: string[] = [];
  types: string[] = [];

  // Predefined fine art options
  readonly predefinedSurfaces: string[] = [
    'Canvas',
    'Paper',
    'Wood Panel',
    'Linen',
    'Cotton',
    'Board',
    'Masonite',
    'Metal',
    'Glass',
    'Fabric',
  ];

  readonly predefinedMedia: string[] = [
    'Oil Paint',
    'Watercolor',
    'Acrylic',
    'Gouache',
    'Tempera',
    'Pastel',
    'Charcoal',
    'Graphite',
    'Ink',
    'Mixed Media',
    'Digital',
    'Encaustic',
    'Fresco',
  ];
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  uploadingImage = false;

  // Detail images
  selectedDetailFile1: File | null = null;
  detailImage1Preview: string | null = null;
  uploadingDetailImage1 = false;

  selectedDetailFile2: File | null = null;
  detailImage2Preview: string | null = null;
  uploadingDetailImage2 = false;

  // Archive management properties
  archiveImages: ArchiveImage[] = [];
  archiveForm!: FormGroup;
  showArchiveForm = false;
  editingArchiveImage: ArchiveImage | null = null;
  selectedArchiveFile: File | null = null;
  archiveImagePreview: string | null = null;
  uploadingArchiveImage = false;
  isDraggingImage = false;

  // Homepage image management properties
  homePageImageUrl: string = '';
  homePageObjectPositionX: number = 50;
  homePageObjectPositionY: number = 50;
  selectedHomePageFile: File | null = null;
  homePageImagePreview: string | null = null;
  uploadingHomePageImage = false;

  // Context page management properties
  contextSectionTitle: string = '';
  contextSectionText: string = '';
  contextImageUrl: string = '';
  contextObjectPositionX: number = 50;
  contextObjectPositionY: number = 50;
  selectedContextFile: File | null = null;
  contextImagePreview: string | null = null;
  uploadingContextImage = false;
  savingContextPage = false;

  // Format slider label
  formatLabel(value: number): string {
    return `${value}%`;
  }

  // Handle slider value changes
  onPositionXChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.archiveForm.patchValue(
      { objectPositionX: Math.round(value) },
      { emitEvent: true }
    );
  }

  onPositionYChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.archiveForm.patchValue(
      { objectPositionY: Math.round(value) },
      { emitEvent: true }
    );
  }

  private dragContainer: HTMLElement | null = null;

  // Handle image drag for positioning
  onImageDragStart(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingImage = true;

    // Store reference to the container
    this.dragContainer = (event.currentTarget as HTMLElement).closest(
      '.image-position-container'
    ) as HTMLElement;
    if (this.dragContainer) {
      this.dragContainer.classList.add('dragging');
      // Calculate initial position
      this.onImageDrag(event);
    }
  }

  onImageDrag(event: MouseEvent) {
    if (!this.isDraggingImage || !this.dragContainer) return;
    event.preventDefault();

    const rect = this.dragContainer.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    this.archiveForm.patchValue(
      {
        objectPositionX: Math.round(clampedX),
        objectPositionY: Math.round(clampedY),
      },
      { emitEvent: true }
    );
  }

  onImageDragEnd() {
    if (this.dragContainer) {
      this.dragContainer.classList.remove('dragging');
    }
    this.isDraggingImage = false;
    this.dragContainer = null;
  }

  // Handle document-level mouse events for dragging
  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent) {
    if (this.isDraggingImage) {
      this.onImageDrag(event);
    }
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp() {
    if (this.isDraggingImage) {
      this.onImageDragEnd();
    }
  }

  // Expose getImageUrl to template
  getImageUrl = getImageUrl;

  ngOnInit(): void {
    this.loadOrders();
    this.loadProducts();
    this.loadBrandsAndTypes();
    this.initProductForm();
    this.loadArchiveImages();
    this.initArchiveForm();
    this.loadHomePageImage();
    this.loadContextPage();
  }

  loadOrders() {
    this.adminService.getOrders(this.orderParams).subscribe({
      next: (response) => {
        if (response.data) {
          this.dataSource.data = response.data;
          this.totalItems = response.count;
        }
      },
    });
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
    );

    if (confirmed) this.refundOrder(id);
  }

  refundOrder(id: number) {
    this.adminService.refundOrder(id).subscribe({
      next: (order) => {
        this.dataSource.data = this.dataSource.data.map((o) =>
          o.id === id ? order : o
        );
      },
    });
  }

  // Product management methods
  initProductForm() {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      pictureUrl: ['', Validators.required],
      detailImage1Url: [''],
      detailImage2Url: [''],
      brand: ['', Validators.required],
      type: ['', Validators.required],
      quantityInStock: [0, [Validators.required, Validators.min(0)]],
      artworkSize: [''],
      useCustomSize: [false],
      customSizeWidth: [null],
      customSizeHeight: [null],
    });

    // Watch for size selection changes
    this.productForm.get('artworkSize')?.valueChanges.subscribe((value) => {
      if (value === 'Custom Size') {
        this.useCustomSize = true;
        this.productForm.patchValue({ useCustomSize: true });
      } else if (value) {
        this.useCustomSize = false;
        this.productForm.patchValue({ useCustomSize: false });
        const selectedSize = this.commonSizes.find((s) => s.label === value);
        if (selectedSize && selectedSize.aspectRatio !== 'custom') {
          this.productForm.patchValue({
            customSizeWidth: selectedSize.width,
            customSizeHeight: selectedSize.height,
          });
        }
      }
    });
  }

  loadProducts() {
    this.adminService
      .getProducts(this.productPageIndex + 1, this.productPageSize)
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.productDataSource.data = response.data;
            this.productTotalItems = response.count;
          }
        },
        error: (err) => {
          this.snackbar.error('Failed to load products');
        },
      });
  }

  loadBrandsAndTypes() {
    // Load from database and merge with predefined options
    this.adminService.getBrands().subscribe({
      next: (brands) => {
        // Only keep values that match fine art surface terms
        const fineArtSurfaces = brands.filter((brand) => {
          const lower = brand.toLowerCase();
          // Include only if it matches fine art surface terms
          const surfaceTerms = [
            'canvas',
            'paper',
            'wood',
            'linen',
            'cotton',
            'board',
            'masonite',
            'metal',
            'glass',
            'fabric',
            'panel',
            'surface',
            'canvas',
            'paper',
            'wood',
            'linen',
            'cotton',
            'board',
          ];
          return surfaceTerms.some((term) => lower.includes(term));
        });
        // Merge predefined surfaces with filtered database brands, remove duplicates, and sort
        const allSurfaces = [...this.predefinedSurfaces, ...fineArtSurfaces];
        this.brands = [...new Set(allSurfaces)].sort();
      },
    });
    this.adminService.getTypes().subscribe({
      next: (types) => {
        // Only keep values that match fine art media terms (oil paintings, watercolor, etc.)
        const fineArtMedia = types.filter((type) => {
          const lower = type.toLowerCase();
          // Include only if it matches fine art media terms
          const mediaTerms = [
            'oil',
            'paint',
            'watercolor',
            'watercolour',
            'acrylic',
            'gouache',
            'tempera',
            'pastel',
            'charcoal',
            'graphite',
            'ink',
            'mixed',
            'digital',
            'encaustic',
            'fresco',
            'drawing',
            'sketch',
            'print',
            'sculpture',
            'ceramic',
            'pottery',
            'clay',
            'bronze',
            'marble',
          ];
          return mediaTerms.some((term) => lower.includes(term));
        });
        // Merge predefined media with filtered database types, remove duplicates, and sort
        const allMedia = [...this.predefinedMedia, ...fineArtMedia];
        this.types = [...new Set(allMedia)].sort();
      },
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
    // Parse size from description (supports both cm and inches for backward compatibility)
    const sizeMatchCm = product.description?.match(
      /(\d+(?:\.\d+)?)\s*cm\s*x\s*(\d+(?:\.\d+)?)\s*cm/i
    );
    const sizeMatchInches = product.description?.match(
      /(\d+(?:\.\d+)?)"\s*x\s*(\d+(?:\.\d+)?)"/i
    );
    let artworkSize = '';
    let useCustom = false;
    let customWidth: number | null = null;
    let customHeight: number | null = null;

    if (sizeMatchCm) {
      customWidth = parseFloat(sizeMatchCm[1]);
      customHeight = parseFloat(sizeMatchCm[2]);
    } else if (sizeMatchInches) {
      // Convert inches to cm (1 inch = 2.54 cm)
      customWidth = parseFloat(sizeMatchInches[1]) * 2.54;
      customHeight = parseFloat(sizeMatchInches[2]) * 2.54;
    }

    if (customWidth !== null && customHeight !== null) {
      // Check if it matches a common size (with tolerance for rounding)
      const matchedSize = this.commonSizes.find(
        (s) =>
          Math.abs(s.width - customWidth!) < 1 &&
          Math.abs(s.height - customHeight!) < 1
      );
      if (matchedSize && matchedSize.aspectRatio !== 'custom') {
        artworkSize = matchedSize.label;
        useCustom = false;
      } else {
        artworkSize = 'Custom Size';
        useCustom = true;
      }
    }

    this.productForm.patchValue({
      name: product.name,
      description: product.description,
      price: product.price,
      pictureUrl: product.pictureUrl,
      detailImage1Url: product.detailImage1Url || '',
      detailImage2Url: product.detailImage2Url || '',
      brand: product.brand,
      type: product.type,
      quantityInStock: product.quantityInStock,
      artworkSize: artworkSize,
      useCustomSize: useCustom,
      customSizeWidth: customWidth,
      customSizeHeight: customHeight,
    });
    this.useCustomSize = useCustom;
    this.imagePreview = product.pictureUrl
      ? getImageUrl(product.pictureUrl)
      : null;
    this.detailImage1Preview = product.detailImage1Url
      ? getImageUrl(product.detailImage1Url)
      : null;
    this.detailImage2Preview = product.detailImage2Url
      ? getImageUrl(product.detailImage2Url)
      : null;
    this.showProductForm = true;
  }

  cancelProductForm() {
    this.showProductForm = false;
    this.editingProduct = null;
    this.useCustomSize = false;
    this.productForm.reset();
    this.clearImageSelection();
  }

  onSizeSelectionChange(event: any) {
    const selectedValue = event.value;
    if (selectedValue === 'Custom Size') {
      this.useCustomSize = true;
      this.productForm.patchValue({ useCustomSize: true });
      // Make custom size fields required
      this.productForm
        .get('customSizeWidth')
        ?.setValidators([Validators.required, Validators.min(0.1)]);
      this.productForm
        .get('customSizeHeight')
        ?.setValidators([Validators.required, Validators.min(0.1)]);
    } else if (selectedValue) {
      this.useCustomSize = false;
      this.productForm.patchValue({ useCustomSize: false });
      // Remove required validators
      this.productForm.get('customSizeWidth')?.clearValidators();
      this.productForm.get('customSizeHeight')?.clearValidators();
      // Set values from selected size
      const selectedSize = this.commonSizes.find(
        (s) => s.label === selectedValue
      );
      if (selectedSize && selectedSize.aspectRatio !== 'custom') {
        this.productForm.patchValue({
          customSizeWidth: selectedSize.width,
          customSizeHeight: selectedSize.height,
        });
      }
    } else {
      this.useCustomSize = false;
      this.productForm.patchValue({ useCustomSize: false });
      this.productForm.get('customSizeWidth')?.clearValidators();
      this.productForm.get('customSizeHeight')?.clearValidators();
    }
    this.productForm.get('customSizeWidth')?.updateValueAndValidity();
    this.productForm.get('customSizeHeight')?.updateValueAndValidity();
  }

  saveProduct() {
    if (this.productForm.invalid) {
      this.snackbar.error('Please fill in all required fields');
      return;
    }

    const formValue = this.productForm.value;

    // Build description with size information
    let description = formValue.description || '';
    const width = formValue.customSizeWidth;
    const height = formValue.customSizeHeight;

    // Remove existing size from description if present (both cm and inches)
    description = description
      .replace(/\d+(?:\.\d+)?\s*cm\s*x\s*\d+(?:\.\d+)?\s*cm/gi, '')
      .trim();
    description = description
      .replace(/\d+(?:\.\d+)?"\s*x\s*\d+(?:\.\d+)?"/gi, '')
      .trim();
    description = description
      .replace(/Size:\s*\d+(?:\.\d+)?\s*cm\s*x\s*\d+(?:\.\d+)?\s*cm/gi, '')
      .trim();
    description = description
      .replace(/Size:\s*\d+(?:\.\d+)?"\s*x\s*\d+(?:\.\d+)?"/gi, '')
      .trim();

    // Remove any trailing "Size:" without a value
    description = description.replace(/Size:\s*$/gi, '').trim();
    description = description.replace(/Size:\s*\n/gi, '').trim();

    // Add size information only if both width and height are provided
    if (width && height && width > 0 && height > 0) {
      const sizeText = `${width} cm x ${height} cm`;
      if (description) {
        description = `${description}\n\nSize: ${sizeText}`;
      } else {
        description = `Size: ${sizeText}`;
      }
    }

    const productData = {
      ...formValue,
      description: description,
    };

    if (this.editingProduct) {
      // Update existing product
      this.adminService
        .updateProduct(this.editingProduct.id, {
          ...this.editingProduct,
          ...productData,
        })
        .subscribe({
          next: () => {
            this.snackbar.success('Product updated successfully');
            this.cancelProductForm();
            this.loadProducts();
          },
          error: () => {
            this.snackbar.error('Failed to update product');
          },
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
        },
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
          this.selectedProducts.delete(id);
          this.loadProducts();
        },
        error: () => {
          this.snackbar.error('Failed to delete product');
        },
      });
    }
  }

  toggleProductSelection(productId: number) {
    if (this.selectedProducts.has(productId)) {
      this.selectedProducts.delete(productId);
    } else {
      this.selectedProducts.add(productId);
    }
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectedProducts.clear();
    } else {
      this.productDataSource.data.forEach((product) => {
        this.selectedProducts.add(product.id);
      });
    }
  }

  isAllSelected(): boolean {
    return (
      this.productDataSource.data.length > 0 &&
      this.selectedProducts.size === this.productDataSource.data.length
    );
  }

  isIndeterminate(): boolean {
    return (
      this.selectedProducts.size > 0 &&
      this.selectedProducts.size < this.productDataSource.data.length
    );
  }

  isProductSelected(productId: number): boolean {
    return this.selectedProducts.has(productId);
  }

  async deleteSelectedProducts() {
    if (this.selectedProducts.size === 0) {
      this.snackbar.error('No products selected');
      return;
    }

    const count = this.selectedProducts.size;
    const confirmed = await this.dialogService.confirm(
      'Delete Selected Products',
      `Are you sure you want to delete ${count} product(s)? This cannot be undone.`
    );

    if (confirmed) {
      const productIds = Array.from(this.selectedProducts);
      let successCount = 0;
      let errorCount = 0;
      const total = productIds.length;

      productIds.forEach((id) => {
        this.adminService.deleteProduct(id).subscribe({
          next: () => {
            successCount++;
            this.selectedProducts.delete(id);
            if (successCount + errorCount === total) {
              if (errorCount === 0) {
                this.snackbar.success(
                  `${successCount} product(s) deleted successfully`
                );
              } else {
                this.snackbar.error(
                  `Deleted ${successCount} product(s), ${errorCount} failed`
                );
              }
              this.selectedProducts.clear();
              this.loadProducts();
            }
          },
          error: () => {
            errorCount++;
            if (successCount + errorCount === total) {
              if (errorCount === 0) {
                this.snackbar.success(
                  `${successCount} product(s) deleted successfully`
                );
              } else {
                this.snackbar.error(
                  `Deleted ${successCount} product(s), ${errorCount} failed`
                );
              }
              this.selectedProducts.clear();
              this.loadProducts();
            }
          },
        });
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
        // Handle response - API returns string directly
        const imageUrl = typeof response === 'string' ? response : '';

        if (!imageUrl) {
          this.snackbar.error('No image URL returned from server');
          this.uploadingImage = false;
          return;
        }

        // Update form with the image URL
        this.productForm.patchValue({ pictureUrl: imageUrl });

        // Keep the preview showing the uploaded image URL
        // Use getImageUrl to convert relative paths to absolute API URLs
        this.imagePreview = getImageUrl(imageUrl);

        this.snackbar.success('Image uploaded successfully');
        this.selectedFile = null;
        this.uploadingImage = false;

        // Reset file input
        setTimeout(() => {
          const fileInput = document.getElementById(
            'imageFileInput'
          ) as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }, 100);
      },
      error: (err) => {
        console.error('Upload error:', err);
        const errorMessage =
          err.error?.message ||
          err.error?.title ||
          err.message ||
          'Failed to upload image';
        this.snackbar.error(errorMessage);
        this.uploadingImage = false;
      },
    });
  }

  selectImageFile() {
    const fileInput = document.getElementById(
      'imageFileInput'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  clearImageSelection() {
    this.selectedFile = null;
    this.imagePreview = null;
    this.selectedDetailFile1 = null;
    this.detailImage1Preview = null;
    this.selectedDetailFile2 = null;
    this.detailImage2Preview = null;
    // Reset file input if it exists
    setTimeout(() => {
      const fileInput = document.getElementById(
        'imageFileInput'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }, 0);
  }

  onDetailFile1Selected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        this.snackbar.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.snackbar.error('File size must be less than 5MB');
        return;
      }

      this.selectedDetailFile1 = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.detailImage1Preview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadDetailImage1() {
    if (!this.selectedDetailFile1) {
      this.snackbar.error('Please select an image file');
      return;
    }

    this.uploadingDetailImage1 = true;
    this.adminService.uploadProductImage(this.selectedDetailFile1).subscribe({
      next: (response) => {
        const imageUrl = typeof response === 'string' ? response : '';

        if (!imageUrl) {
          this.snackbar.error('No image URL returned from server');
          this.uploadingDetailImage1 = false;
          return;
        }

        this.productForm.patchValue({ detailImage1Url: imageUrl });
        this.detailImage1Preview = getImageUrl(imageUrl);
        this.snackbar.success('Detail image 1 uploaded successfully');
        this.selectedDetailFile1 = null;
        this.uploadingDetailImage1 = false;

        setTimeout(() => {
          const fileInput = document.getElementById(
            'detailImage1FileInput'
          ) as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }, 100);
      },
      error: (err) => {
        console.error('Upload error:', err);
        const errorMessage =
          err.error?.message ||
          err.error?.title ||
          err.message ||
          'Failed to upload image';
        this.snackbar.error(errorMessage);
        this.uploadingDetailImage1 = false;
      },
    });
  }

  selectDetailImage1File() {
    const fileInput = document.getElementById(
      'detailImage1FileInput'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onDetailFile2Selected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        this.snackbar.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.snackbar.error('File size must be less than 5MB');
        return;
      }

      this.selectedDetailFile2 = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.detailImage2Preview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadDetailImage2() {
    if (!this.selectedDetailFile2) {
      this.snackbar.error('Please select an image file');
      return;
    }

    this.uploadingDetailImage2 = true;
    this.adminService.uploadProductImage(this.selectedDetailFile2).subscribe({
      next: (response) => {
        const imageUrl = typeof response === 'string' ? response : '';

        if (!imageUrl) {
          this.snackbar.error('No image URL returned from server');
          this.uploadingDetailImage2 = false;
          return;
        }

        this.productForm.patchValue({ detailImage2Url: imageUrl });
        this.detailImage2Preview = getImageUrl(imageUrl);
        this.snackbar.success('Detail image 2 uploaded successfully');
        this.selectedDetailFile2 = null;
        this.uploadingDetailImage2 = false;

        setTimeout(() => {
          const fileInput = document.getElementById(
            'detailImage2FileInput'
          ) as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }, 100);
      },
      error: (err) => {
        console.error('Upload error:', err);
        const errorMessage =
          err.error?.message ||
          err.error?.title ||
          err.message ||
          'Failed to upload image';
        this.snackbar.error(errorMessage);
        this.uploadingDetailImage2 = false;
      },
    });
  }

  selectDetailImage2File() {
    const fileInput = document.getElementById(
      'detailImage2FileInput'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Archive management methods
  initArchiveForm() {
    this.archiveForm = this.fb.group({
      imageUrl: ['', Validators.required],
      title: ['', Validators.required],
      description: [''],
      displayOrder: [0, [Validators.required, Validators.min(0)]],
      isMainImage: [false],
      objectPositionX: [
        50,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      objectPositionY: [
        50,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
    });
  }

  loadArchiveImages() {
    this.adminService.getArchiveImages().subscribe({
      next: (images) => {
        // Ensure all images have position values (default to 50 if missing)
        this.archiveImages = images
          .map((img) => ({
            ...img,
            objectPositionX: img.objectPositionX ?? 50,
            objectPositionY: img.objectPositionY ?? 50,
          }))
          .sort((a, b) => a.displayOrder - b.displayOrder);

        console.log(
          'Loaded archive images with positions:',
          this.archiveImages.map((img) => ({
            id: img.id,
            title: img.title,
            x: img.objectPositionX,
            y: img.objectPositionY,
          }))
        );
      },
      error: (err) => {
        this.snackbar.error('Failed to load archive images');
      },
    });
  }

  onArchiveImageDrop(event: CdkDragDrop<ArchiveImage[]>) {
    moveItemInArray(
      this.archiveImages,
      event.previousIndex,
      event.currentIndex
    );

    // Update displayOrder for all images based on their new positions
    this.archiveImages.forEach((image, index) => {
      image.displayOrder = index + 1;
    });

    // Save the new order to the backend
    this.saveArchiveImageOrder();
  }

  saveArchiveImageOrder() {
    // Update all images with their new displayOrder
    const updatePromises = this.archiveImages.map((image) => {
      const updateDto: UpdateArchiveImageDto = {
        displayOrder: image.displayOrder,
      };
      return this.adminService
        .updateArchiveImage(image.id, updateDto)
        .toPromise();
    });

    Promise.all(updatePromises)
      .then(() => {
        this.snackbar.success('Archive image order updated successfully');
      })
      .catch((error) => {
        console.error('Error updating archive image order:', error);
        this.snackbar.error('Failed to update archive image order');
        // Reload images to revert to original order
        this.loadArchiveImages();
      });
  }

  openAddArchiveForm() {
    this.editingArchiveImage = null;
    this.archiveForm.reset({
      displayOrder: 0,
      isMainImage: false,
      objectPositionX: 50,
      objectPositionY: 50,
    });
    this.showArchiveForm = true;
  }

  openEditArchiveForm(image: ArchiveImage) {
    this.editingArchiveImage = image;
    // Ensure position values are set (default to 50 if missing)
    const positionX =
      image.objectPositionX != null ? image.objectPositionX : 50;
    const positionY =
      image.objectPositionY != null ? image.objectPositionY : 50;

    this.archiveForm.patchValue({
      imageUrl: image.imageUrl,
      title: image.title,
      description: image.description || '',
      displayOrder: image.displayOrder,
      isMainImage: image.isMainImage,
      objectPositionX: positionX,
      objectPositionY: positionY,
    });
    this.archiveImagePreview = getImageUrl(image.imageUrl);
    this.showArchiveForm = true;
  }

  cancelArchiveForm() {
    this.showArchiveForm = false;
    this.editingArchiveImage = null;
    this.archiveForm.reset();
    this.clearArchiveImageSelection();
  }

  saveArchiveImage() {
    if (this.archiveForm.invalid) {
      this.snackbar.error('Please fill in all required fields');
      return;
    }

    // Explicitly extract all form values including position
    const formValue = this.archiveForm.value;
    const positionX =
      formValue.objectPositionX != null
        ? Number(formValue.objectPositionX)
        : 50;
    const positionY =
      formValue.objectPositionY != null
        ? Number(formValue.objectPositionY)
        : 50;

    if (this.editingArchiveImage) {
      const updateData: UpdateArchiveImageDto = {
        imageUrl: formValue.imageUrl,
        title: formValue.title,
        description: formValue.description || '',
        displayOrder: formValue.displayOrder,
        isMainImage: formValue.isMainImage,
        objectPositionX: positionX,
        objectPositionY: positionY,
      };

      console.log('Updating archive image with data:', updateData);

      this.adminService
        .updateArchiveImage(this.editingArchiveImage.id, updateData)
        .subscribe({
          next: (updatedImage) => {
            console.log('Archive image updated:', updatedImage);
            console.log('Position values sent:', {
              x: positionX,
              y: positionY,
            });
            console.log('Position values in response:', {
              x: updatedImage.objectPositionX,
              y: updatedImage.objectPositionY,
              hasX: 'objectPositionX' in updatedImage,
              hasY: 'objectPositionY' in updatedImage,
              rawResponse: updatedImage,
            });

            // Always use the form values we sent, not the response (in case response is missing them)
            // But first try to use response values if they exist
            const finalX =
              updatedImage.objectPositionX != null &&
              updatedImage.objectPositionX !== undefined
                ? updatedImage.objectPositionX
                : positionX;
            const finalY =
              updatedImage.objectPositionY != null &&
              updatedImage.objectPositionY !== undefined
                ? updatedImage.objectPositionY
                : positionY;

            console.log('Final position values to use:', {
              x: finalX,
              y: finalY,
            });

            this.snackbar.success('Archive image updated successfully');

            // Update the local image data with the correct position values
            const imageIndex = this.archiveImages.findIndex(
              (img) => img.id === this.editingArchiveImage!.id
            );
            if (imageIndex >= 0) {
              this.archiveImages[imageIndex] = {
                ...this.archiveImages[imageIndex],
                objectPositionX: finalX,
                objectPositionY: finalY,
              };
            }

            this.cancelArchiveForm();
            // Reload to get fresh data from server
            this.loadArchiveImages();
          },
          error: (err) => {
            console.error('Update error:', err);
            this.snackbar.error('Failed to update archive image');
          },
        });
    } else {
      const createData: CreateArchiveImageDto = {
        imageUrl: formValue.imageUrl,
        title: formValue.title,
        description: formValue.description || '',
        displayOrder: formValue.displayOrder,
        isMainImage: formValue.isMainImage,
        objectPositionX: positionX,
        objectPositionY: positionY,
      };

      console.log('Creating archive image with data:', createData);

      this.adminService.createArchiveImage(createData).subscribe({
        next: (createdImage) => {
          console.log('Archive image created:', createdImage);
          this.snackbar.success('Archive image created successfully');
          this.cancelArchiveForm();
          this.loadArchiveImages();
        },
        error: (err) => {
          console.error('Create error:', err);
          this.snackbar.error('Failed to create archive image');
        },
      });
    }
  }

  async deleteArchiveImage(id: number) {
    const confirmed = await this.dialogService.confirm(
      'Delete Archive Image',
      'Are you sure you want to delete this image? This cannot be undone.'
    );

    if (confirmed) {
      this.adminService.deleteArchiveImage(id).subscribe({
        next: () => {
          this.snackbar.success('Archive image deleted successfully');
          this.loadArchiveImages();
        },
        error: () => {
          this.snackbar.error('Failed to delete archive image');
        },
      });
    }
  }

  onArchiveFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        this.snackbar.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.snackbar.error('File size must be less than 5MB');
        return;
      }

      this.selectedArchiveFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.archiveImagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadArchiveImage() {
    if (!this.selectedArchiveFile) {
      this.snackbar.error('Please select an image file');
      return;
    }

    this.uploadingArchiveImage = true;
    this.adminService.uploadArchiveImage(this.selectedArchiveFile).subscribe({
      next: (imageUrl) => {
        if (!imageUrl) {
          this.snackbar.error('No image URL returned from server');
          this.uploadingArchiveImage = false;
          return;
        }

        // Update form with the image URL
        this.archiveForm.patchValue({ imageUrl });

        // Keep the preview showing the uploaded image URL
        // Use getImageUrl to convert relative paths to absolute API URLs
        this.archiveImagePreview = getImageUrl(imageUrl);

        this.snackbar.success('Image uploaded successfully');
        this.selectedArchiveFile = null;
        this.uploadingArchiveImage = false;

        // Reset file input
        setTimeout(() => {
          const fileInput = document.getElementById(
            'archiveImageFileInput'
          ) as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }, 100);
      },
      error: (err) => {
        console.error('Archive upload error:', err);
        const errorMessage =
          err.error?.message ||
          err.error?.title ||
          err.message ||
          'Failed to upload image';
        this.snackbar.error(errorMessage);
        this.uploadingArchiveImage = false;
      },
    });
  }

  selectArchiveImageFile() {
    const fileInput = document.getElementById(
      'archiveImageFileInput'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  clearArchiveImageSelection() {
    this.selectedArchiveFile = null;
    this.archiveImagePreview = null;
    setTimeout(() => {
      const fileInput = document.getElementById(
        'archiveImageFileInput'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }, 0);
  }

  // Homepage image management methods
  loadHomePageImage() {
    this.adminService.getHomePageImage().subscribe({
      next: (response) => {
        // Filter out invalid localhost:3845 URLs
        if (
          response.imageUrl &&
          !response.imageUrl.includes('localhost:3845')
        ) {
          this.homePageImageUrl = getImageUrl(response.imageUrl);
        } else {
          this.homePageImageUrl = '';
        }
        this.homePageObjectPositionX = response.objectPositionX ?? 50;
        this.homePageObjectPositionY = response.objectPositionY ?? 50;
      },
      error: (err) => {
        console.error('Failed to load homepage image:', err);
        this.homePageImageUrl = '';
        this.homePageObjectPositionX = 50;
        this.homePageObjectPositionY = 50;
      },
    });
  }

  selectHomePageImageFile() {
    const fileInput = document.getElementById(
      'homePageImageFileInput'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onHomePageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedHomePageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.homePageImagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  uploadHomePageImage() {
    if (!this.selectedHomePageFile) {
      this.snackbar.error('Please select an image file');
      return;
    }

    this.uploadingHomePageImage = true;
    this.adminService.uploadHomePageImage(this.selectedHomePageFile).subscribe({
      next: (imageUrl) => {
        const fullImageUrl = getImageUrl(imageUrl);
        this.homePageImageUrl = fullImageUrl;
        this.homePageImagePreview = fullImageUrl;
        this.selectedHomePageFile = null;
        this.uploadingHomePageImage = false;

        // Automatically save the image with current position values
        this.adminService
          .updateHomePageImage(
            fullImageUrl,
            this.homePageObjectPositionX,
            this.homePageObjectPositionY
          )
          .subscribe({
            next: () => {
              this.snackbar.success('Image uploaded and saved successfully');
            },
            error: (err) => {
              console.error('Save error:', err);
              this.snackbar.warning(
                'Image uploaded but failed to save position'
              );
            },
          });
      },
      error: (err) => {
        console.error('Upload error:', err);
        this.snackbar.error('Failed to upload image');
        this.uploadingHomePageImage = false;
      },
    });
  }

  clearHomePageImageSelection() {
    this.selectedHomePageFile = null;
    this.homePageImagePreview = null;
    setTimeout(() => {
      const fileInput = document.getElementById(
        'homePageImageFileInput'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }, 0);
  }

  saveHomePageImage() {
    if (!this.homePageImageUrl) {
      this.snackbar.error('Please provide an image URL');
      return;
    }

    this.adminService
      .updateHomePageImage(
        this.homePageImageUrl,
        this.homePageObjectPositionX,
        this.homePageObjectPositionY
      )
      .subscribe({
        next: () => {
          this.snackbar.success('Homepage image updated successfully');
          this.homePageImagePreview = null;
        },
        error: (err) => {
          console.error('Update error:', err);
          this.snackbar.error('Failed to update homepage image');
        },
      });
  }

  onHomePagePositionXChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.homePageObjectPositionX = Math.round(value);
  }

  onHomePagePositionYChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.homePageObjectPositionY = Math.round(value);
  }

  resetHomePagePosition() {
    this.homePageObjectPositionX = 50;
    this.homePageObjectPositionY = 50;
  }

  onHomePageImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Hide the image on error instead of trying to load an invalid URL
    img.style.display = 'none';
  }

  // Context page management methods
  loadContextPage() {
    this.adminService.getContextPage().subscribe({
      next: (response) => {
        this.contextSectionTitle = response.sectionTitle || '';
        this.contextSectionText = response.sectionText || '';

        // Filter out invalid localhost:3845 URLs and convert to absolute URL
        if (
          response.imageUrl &&
          !response.imageUrl.includes('localhost:3845')
        ) {
          this.contextImageUrl = getImageUrl(response.imageUrl);
        } else {
          this.contextImageUrl = '';
        }

        this.contextObjectPositionX = response.objectPositionX ?? 50;
        this.contextObjectPositionY = response.objectPositionY ?? 50;
      },
      error: (err) => {
        console.error('Failed to load context page:', err);
        console.error('Error details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error,
        });
        // Use default values on error
        this.contextSectionTitle = 'A Period of Juvenile Prosperity';
        this.contextSectionText =
          'At the age of 17, Mike Brodie hopped his first train close to home in Pensacola, Florida, thinking he would visit a friend in Mobile, Alabama. Instead, the train took him in the opposite direction to Jacksonville, Florida. Days later he rode the same train home, arriving back where he started.\n\nNonetheless, it sparked something in him and he began to wander across America by any means that were free - walking, hitchhiking, and train hopping. Shortly after his travels began he found a camera stuffed behind a car seat and began to take pictures. Brodie spent years crisscrossing the U.S., documenting his experiences, now appreciated as one of the most impressive archives of American travel photography.\n\nA Period of Juvenile Prosperity was named the best exhibition of the year by Vince Aletti in Artforum; and cited as one of the best photo books of 2013 by The Guardian, The New York Times, The Telegraph, and American Photo; it was short-listed for the Paris Photo/Aperture Foundation First PhotoBook Award.';
        this.contextImageUrl = '';
        this.contextObjectPositionX = 50;
        this.contextObjectPositionY = 50;
      },
    });
  }

  selectContextImageFile() {
    const fileInput = document.getElementById(
      'contextImageFileInput'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onContextFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedContextFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.contextImagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  uploadContextImage() {
    if (!this.selectedContextFile) {
      this.snackbar.error('Please select an image file');
      return;
    }

    console.log('Starting context image upload...');
    console.log(
      'File:',
      this.selectedContextFile.name,
      this.selectedContextFile.size,
      'bytes'
    );

    this.uploadingContextImage = true;
    this.adminService.uploadContextImage(this.selectedContextFile).subscribe({
      next: (imageUrl) => {
        console.log('Upload successful, received URL:', imageUrl);
        const fullImageUrl = getImageUrl(imageUrl);
        this.contextImageUrl = fullImageUrl;
        this.contextImagePreview = fullImageUrl;
        this.selectedContextFile = null;
        this.uploadingContextImage = false;
        this.snackbar.success('Image uploaded successfully');
      },
      error: (err) => {
        console.error('Upload error:', err);
        console.error('Error details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error,
          url: err.url,
        });
        const errorMessage =
          err.error?.message || err.message || 'Failed to upload image';
        this.snackbar.error(errorMessage);
        this.uploadingContextImage = false;
      },
    });
  }

  clearContextImageSelection() {
    this.selectedContextFile = null;
    this.contextImagePreview = null;
    setTimeout(() => {
      const fileInput = document.getElementById(
        'contextImageFileInput'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }, 0);
  }

  saveContextPage() {
    // Convert absolute URL back to relative path if needed for storage
    let imageUrlToSave = this.contextImageUrl;
    if (imageUrlToSave && imageUrlToSave.includes('/images/')) {
      // Extract the relative path from absolute URL
      const match = imageUrlToSave.match(/\/images\/[^?]+/);
      if (match) {
        imageUrlToSave = match[0];
      }
    }

    this.savingContextPage = true;
    this.adminService
      .updateContextPage(
        this.contextSectionTitle,
        this.contextSectionText,
        imageUrlToSave,
        this.contextObjectPositionX,
        this.contextObjectPositionY
      )
      .subscribe({
        next: () => {
          this.snackbar.success('Context page updated successfully');
          this.contextImagePreview = null;
          this.savingContextPage = false;
        },
        error: (err) => {
          console.error('Update error:', err);
          console.error('Error details:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            error: err.error,
          });
          this.snackbar.error('Failed to update context page');
          this.savingContextPage = false;
        },
      });
  }

  onContextPositionXChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.contextObjectPositionX = Math.round(value);
  }

  onContextPositionYChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.contextObjectPositionY = Math.round(value);
  }

  resetContextPosition() {
    this.contextObjectPositionX = 50;
    this.contextObjectPositionY = 50;
  }

  onContextImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
