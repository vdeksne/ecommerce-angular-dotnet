import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { AccountService } from '../../core/services/account.service';
import { ArchiveImage } from '../../shared/models/archive-image';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { SnackbarService } from '../../core/services/snackbar.service';
import { RouterLink } from '@angular/router';
import { getImageUrl } from '../../shared/utils/image-url.util';

@Component({
  selector: 'app-archive',
  standalone: true,
  imports: [
    CommonModule,
    MatButton,
    MatIcon,
    RouterLink
  ],
  templateUrl: './archive.html',
  styleUrl: './archive.scss',
})
export class ArchiveComponent implements OnInit {
  private adminService = inject(AdminService);
  accountService = inject(AccountService);
  private snackbar = inject(SnackbarService);
  
  images: ArchiveImage[] = [];
  mainImage: ArchiveImage | null = null;
  thumbnailImages: ArchiveImage[] = [];
  selectedMainImage: ArchiveImage | null = null; // Currently displayed main image
  loading = false;

  ngOnInit(): void {
    this.loadImages();
  }

  loadImages() {
    this.loading = true;
    this.adminService.getArchiveImages().subscribe({
      next: (images) => {
        this.images = images || [];
        // Ensure all images have position values (default to 50 if missing)
        this.images = this.images.map(img => ({
          ...img,
          objectPositionX: img.objectPositionX ?? 50,
          objectPositionY: img.objectPositionY ?? 50
        }));
        // Find the main image (marked as isMainImage)
        this.mainImage = this.images.find(img => img.isMainImage) || null;
        // All other images as thumbnails, sorted by display order
        this.thumbnailImages = this.images.filter(img => !img.isMainImage).sort((a, b) => a.displayOrder - b.displayOrder);
        // Set the selected main image to display (default to the one marked as main)
        this.selectedMainImage = this.mainImage || (this.images.length > 0 ? this.images[0] : null);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load archive images:', err);
        console.error('Error details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error
        });
        // Set empty arrays on error to prevent template errors
        this.images = [];
        this.mainImage = null;
        this.thumbnailImages = [];
        this.selectedMainImage = null;
        this.loading = false;
      }
    });
  }

  deleteImage(id: number) {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    this.adminService.deleteArchiveImage(id).subscribe({
      next: () => {
        this.snackbar.success('Image deleted successfully');
        this.loadImages();
      },
      error: (err) => {
        this.snackbar.error('Failed to delete image');
        console.error(err);
      }
    });
  }
  
  // Click handler to change the main displayed image
  selectMainImage(image: ArchiveImage) {
    this.selectedMainImage = image;
  }

  getImageUrl = getImageUrl;
}
