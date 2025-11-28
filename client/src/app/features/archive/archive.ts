import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { AccountService } from '../../core/services/account.service';
import { ArchiveImage } from '../../shared/models/archive-image';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { SnackbarService } from '../../core/services/snackbar.service';
import { RouterLink } from '@angular/router';
import { getImageUrl } from '../../shared/utils/image-url.util';
import { interval, Subscription } from 'rxjs';

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
export class ArchiveComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  accountService = inject(AccountService);
  private snackbar = inject(SnackbarService);
  
  images: ArchiveImage[] = [];
  allImages: ArchiveImage[] = []; // All images sorted by display order
  mainImage: ArchiveImage | null = null;
  thumbnailImages: ArchiveImage[] = [];
  selectedMainImage: ArchiveImage | null = null; // Currently displayed main image
  loading = false;
  
  // Autoplay settings
  private autoplayInterval: Subscription | null = null;
  private autoplayDelay = 4000; // 4 seconds between images
  isAutoplayPaused = false;

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
        // Sort all images by display order
        this.allImages = this.images.sort((a, b) => a.displayOrder - b.displayOrder);
        // Find the main image (marked as isMainImage)
        this.mainImage = this.images.find(img => img.isMainImage) || null;
        // All other images as thumbnails, sorted by display order
        this.thumbnailImages = this.images.filter(img => !img.isMainImage).sort((a, b) => a.displayOrder - b.displayOrder);
        // Set the selected main image to display (default to the one marked as main)
        this.selectedMainImage = this.mainImage || (this.images.length > 0 ? this.images[0] : null);
        this.loading = false;
        
        // Start autoplay if there are multiple images
        this.startAutoplay();
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
    // Restart autoplay after manual selection
    this.restartAutoplay();
  }

  // Navigate to previous image
  previousImage() {
    if (this.allImages.length === 0 || !this.selectedMainImage) return;
    
    const currentIndex = this.allImages.findIndex(img => img.id === this.selectedMainImage?.id);
    if (currentIndex === -1) return;
    
    const previousIndex = currentIndex === 0 ? this.allImages.length - 1 : currentIndex - 1;
    this.selectedMainImage = this.allImages[previousIndex];
    // Restart autoplay after manual navigation
    this.restartAutoplay();
  }

  // Navigate to next image
  nextImage() {
    if (this.allImages.length === 0 || !this.selectedMainImage) return;
    
    const currentIndex = this.allImages.findIndex(img => img.id === this.selectedMainImage?.id);
    if (currentIndex === -1) return;
    
    const nextIndex = currentIndex === this.allImages.length - 1 ? 0 : currentIndex + 1;
    this.selectedMainImage = this.allImages[nextIndex];
  }

  // Check if we can navigate (at least 2 images)
  canNavigate(): boolean {
    return this.allImages.length > 1;
  }

  // Keyboard navigation support
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.canNavigate()) return;
    
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousImage();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextImage();
    }
    // Autoplay will restart automatically after manual navigation
  }

  // Autoplay methods
  startAutoplay() {
    this.stopAutoplay(); // Clear any existing interval
    
    if (!this.canNavigate() || this.isAutoplayPaused) {
      return;
    }
    
    this.autoplayInterval = interval(this.autoplayDelay).subscribe(() => {
      if (!this.isAutoplayPaused) {
        this.nextImage();
      }
    });
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      this.autoplayInterval.unsubscribe();
      this.autoplayInterval = null;
    }
  }

  restartAutoplay() {
    this.stopAutoplay();
    // Restart after a short delay to allow user interaction
    setTimeout(() => {
      if (!this.isAutoplayPaused) {
        this.startAutoplay();
      }
    }, 1000);
  }

  pauseAutoplay() {
    this.isAutoplayPaused = true;
    this.stopAutoplay();
  }

  resumeAutoplay() {
    this.isAutoplayPaused = false;
    this.startAutoplay();
  }

  ngOnDestroy() {
    this.stopAutoplay();
  }

  getImageUrl = getImageUrl;
}
