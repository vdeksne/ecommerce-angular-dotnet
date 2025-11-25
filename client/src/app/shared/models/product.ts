export type Product = {
    id: number;
    name: string;
    description: string;
    price: number;
    pictureUrl: string;
    detailImage1Url?: string | null;
    detailImage2Url?: string | null;
    type: string;
    brand: string;
    quantityInStock: number;
}