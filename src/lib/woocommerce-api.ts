import { WooProduct, WooCategory } from './types';

// In a real app, you would fetch from your WooCommerce API.
const WOOCOMMERCE_API_URL = process.env.WOOCOMMERCE_API_URL;

const getAuthHeaders = () => {
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
    if (!consumerKey || !consumerSecret || !WOOCOMMERCE_API_URL) {
        console.error("WooCommerce API credentials or URL are not set.");
        throw new Error("WooCommerce API credentials or URL are not set.");
    }
    const base64Auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    return { 'Authorization': `Basic ${base64Auth}`, 'Content-Type': 'application/json' };
}

export async function getProducts(page = 1, perPage = 10, category?: string): Promise<{products: WooProduct[], totalPages: number, totalProducts: number}> {
  const headers = getAuthHeaders();
  const categoryParam = category ? `&category=${category}` : '';
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products?per_page=${perPage}&page=${page}${categoryParam}&_embed`, { headers, cache: 'no-store' });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to fetch products:", response.status, errorBody);
    throw new Error('Failed to fetch products');
  }

  const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
  const totalProducts = parseInt(response.headers.get('X-WP-Total') || '0', 10);
  const products: WooProduct[] = await response.json();

  return {
    products,
    totalPages,
    totalProducts,
  };
}

export async function getTopProductCategories(): Promise<WooCategory[]> {
    const headers = getAuthHeaders();
    // Fetches top categories by product count, excluding 'uncategorized'
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories?hide_empty=true&orderby=count&order=desc&per_page=100`, { headers, cache: 'no-store' });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Failed to fetch product categories:", response.status, errorBody);
        throw new Error('Failed to fetch product categories');
    }

    const categories: WooCategory[] = await response.json();
    return categories.filter(c => c.slug !== 'uncategorized');
}

export async function getAllProductCategories(): Promise<WooCategory[]> {
    const headers = getAuthHeaders();
    // Fetches all categories, ordered by name
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories?orderby=name&order=asc&per_page=100`, { headers, cache: 'no-store' });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Failed to fetch all product categories:", response.status, errorBody);
        throw new Error('Failed to fetch all product categories');
    }
    const categories: WooCategory[] = await response.json();
    return categories.filter(c => c.slug !== 'uncategorized');
}


export async function getProduct(id: number): Promise<WooProduct | null> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/${id}?_embed`, { headers, cache: 'no-store' });

    if (!response.ok) {
        if (response.status === 404) {
            return null;
        }
        const errorBody = await response.text();
        console.error(`Failed to fetch product ${id}:`, response.status, errorBody);
        throw new Error(`Failed to fetch product ${id}`);
    }

    return await response.json();
}

export async function createProduct(productData: any): Promise<WooProduct> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(productData)
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error("Failed to create product:", response.status, errorBody);
        throw new Error(errorBody.message || 'Failed to create product');
    }

    return await response.json();
}

export async function updateProduct(id: number, productData: any): Promise<WooProduct> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(productData)
    });
    
    if (!response.ok) {
        const errorBody = await response.json();
        console.error(`Failed to update product ${id}:`, response.status, errorBody);
        throw new Error(errorBody.message || 'Failed to update product');
    }

    return await response.json();
}

export async function createCategory(categoryData: { name: string; slug?: string; parent?: number, image?: { id?: number, src?: string } }): Promise<WooCategory> {
  const headers = getAuthHeaders();
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('Failed to create category:', response.status, errorBody);
    throw new Error(errorBody.message || 'Failed to create category');
  }

  return await response.json();
}

export async function updateCategory(id: number, categoryData: { name?: string; slug?: string; parent?: number, image?: { id?: number, src?: string } }): Promise<WooCategory> {
  const headers = getAuthHeaders();
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error(`Failed to update category ${id}:`, response.status, errorBody);
    throw new Error(errorBody.message || `Failed to update category ${id}`);
  }

  return await response.json();
}

export async function deleteCategory(id: number, force: boolean = true): Promise<WooCategory> {
  const headers = getAuthHeaders();
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories/${id}?force=${force}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error(`Failed to delete category ${id}:`, response.status, errorBody);
    throw new Error(errorBody.message || `Failed to delete category ${id}`);
  }

  return await response.json();
}


export async function uploadImage(imageName: string, imageB64: string): Promise<{id: number, src: string}> {
    const wpApiUrl = process.env.WORDPRESS_API_URL;
    const user = process.env.WORDPRESS_AUTH_USER;
    const pass = process.env.WORDPRESS_AUTH_PASS;

    if(!wpApiUrl || !user || !pass) {
        console.error("WordPress API credentials or URL are not set.");
        throw new Error("WordPress API credentials or URL are not set.");
    }
    
    const mimeTypeMatch = imageB64.match(/^data:(image\/[a-z]+);base64,/);
    if (!mimeTypeMatch) {
      throw new Error('Invalid Base64 image format. Could not determine MIME type.');
    }
    const mimeType = mimeTypeMatch[1];
    
    const imageBuffer = Buffer.from(imageB64.split(';base64,').pop()!, 'base64');
    
    const response = await fetch(`${wpApiUrl}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${imageName}"`
      },
      body: imageBuffer
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Failed to upload image:", response.status, errorBody);
      throw new Error(errorBody.message || 'Failed to upload image');
    }

    const data = await response.json();
    return { id: data.id, src: data.source_url };
}
