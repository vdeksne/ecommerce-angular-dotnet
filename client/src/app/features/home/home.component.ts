import { Component, inject, OnInit } from '@angular/core';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private adminService = inject(AdminService);
  
  // Default image fallback - using a data URI placeholder or you can use a relative path
  // For now, using empty string which will be handled by the template
  mainImageUrl = '';
  objectPositionX: number = 50;
  objectPositionY: number = 50;

  ngOnInit(): void {
    this.loadHomePageImage();
  }

  loadHomePageImage(): void {
    this.adminService.getHomePageImage().subscribe({
      next: (response) => {
        // Always update position values, even if image URL is empty
        this.objectPositionX = response.objectPositionX ?? 50;
        this.objectPositionY = response.objectPositionY ?? 50;
        
        // Only update image URL if we got a valid non-empty URL
        if (response.imageUrl && response.imageUrl.trim() !== '') {
          this.mainImageUrl = response.imageUrl;
        } else {
          this.mainImageUrl = '';
        }
      },
      error: (err) => {
        console.error('Failed to load homepage image:', err);
        // Keep default (empty) on error
        this.mainImageUrl = '';
        this.objectPositionX = 50;
        this.objectPositionY = 50;
      },
    });
  }
}
