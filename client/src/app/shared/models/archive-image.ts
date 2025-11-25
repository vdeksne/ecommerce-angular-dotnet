export interface ArchiveImage {
  id: number;
  imageUrl: string;
  title: string;
  description?: string;
  displayOrder: number;
  isMainImage: boolean;
  objectPositionX?: number; // Optional because API might not always return it
  objectPositionY?: number; // Optional because API might not always return it
  createdAt: string;
}

export interface CreateArchiveImageDto {
  imageUrl: string;
  title: string;
  description?: string;
  displayOrder: number;
  isMainImage: boolean;
  objectPositionX: number;
  objectPositionY: number;
}

export interface UpdateArchiveImageDto {
  imageUrl?: string;
  title?: string;
  description?: string;
  displayOrder?: number;
  isMainImage?: boolean;
  objectPositionX?: number;
  objectPositionY?: number;
}

