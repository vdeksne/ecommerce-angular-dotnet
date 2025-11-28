import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { getImageUrl } from '../../shared/utils/image-url.util';

@Component({
  selector: 'app-context',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './context.html',
  styleUrl: './context.scss',
})
export class ContextComponent implements OnInit {
  private adminService = inject(AdminService);

  sectionTitle = '';
  sectionText = '';
  imageUrl = '';
  objectPositionX: number = 50;
  objectPositionY: number = 50;

  ngOnInit(): void {
    this.loadContextPage();
  }

  loadContextPage(): void {
    this.adminService.getContextPage().subscribe({
      next: (response) => {
        this.sectionTitle = response.sectionTitle || '';
        this.sectionText = response.sectionText || '';

        // Only update image URL if we got a valid non-empty URL
        if (response.imageUrl && response.imageUrl.trim() !== '') {
          this.imageUrl = response.imageUrl;
        } else {
          this.imageUrl = '';
        }

        this.objectPositionX = response.objectPositionX ?? 50;
        this.objectPositionY = response.objectPositionY ?? 50;
      },
      error: (err) => {
        console.error('Failed to load context page:', err);
        // Use default values on error
        this.sectionTitle = 'A Period of Juvenile Prosperity';
        this.sectionText =
          'At the age of 17, Mike Brodie hopped his first train close to home in Pensacola, Florida, thinking he would visit a friend in Mobile, Alabama. Instead, the train took him in the opposite direction to Jacksonville, Florida. Days later he rode the same train home, arriving back where he started.\n\nNonetheless, it sparked something in him and he began to wander across America by any means that were free - walking, hitchhiking, and train hopping. Shortly after his travels began he found a camera stuffed behind a car seat and began to take pictures. Brodie spent years crisscrossing the U.S., documenting his experiences, now appreciated as one of the most impressive archives of American travel photography.\n\nA Period of Juvenile Prosperity was named the best exhibition of the year by Vince Aletti in Artforum; and cited as one of the best photo books of 2013 by The Guardian, The New York Times, The Telegraph, and American Photo; it was short-listed for the Paris Photo/Aperture Foundation First PhotoBook Award.';
        this.imageUrl = '';
        this.objectPositionX = 50;
        this.objectPositionY = 50;
      },
    });
  }

  getParagraphs(): string[] {
    if (!this.sectionText) return [];
    return this.sectionText.split('\n').filter((p) => p.trim() !== '');
  }

  getImageUrl = getImageUrl;
}
