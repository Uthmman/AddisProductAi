export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: 'simple' | 'variable' | 'grouped' | 'external';
  status: 'draft' | 'pending' | 'private' | 'publish';
  featured: boolean;
  catalog_visibility: 'visible' | 'catalog' | 'search' | 'hidden';
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  images: { id: number; src: string; alt: string }[];
  attributes: { id: number; name: string; options: string[] }[];
  meta_data: { id: number; key: string; value: string | any }[];
  tags: { id: number; name: string; slug: string }[];
  categories: { id: number; name: string; slug: string }[];
}

export type AIProductContent = {
  name?: string;
  slug?: string;
  description?: string;
  short_description?: string;
  tags?: string[];
  categories?: string[];
  meta_data?: { key: string; value: string }[];
  attributes?: { name: string; option: string }[];
  images?: { alt: string }[];
  regular_price?: number;
};

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: {
    id: number;
    src: string;
    alt: string;
  } | null;
  menu_order: number;
  count: number;
}

export interface Settings {
    phoneNumber: string;
    facebookUrl: string;
    instagramUrl: string;
    telegramUrl: string;
    tiktokUrl: string;
    commonKeywords?: string;
    watermarkImageUrl?: string;
}
