import { WooProduct, WooCategory, WooTag } from './types';
import type { Settings } from './types';

const WOOCOMMERCE_API_URL = process.env.WOOCOMMERCE_API_URL;

const getAuthHeaders = () => {
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
    
    if (!consumerKey || !consumerSecret || !WOOCOMMERCE_API_URL) {
        throw new Error("WooCommerce API credentials or URL are not configured or are incorrect.");
    }
    const base64Auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    return { 'Authorization': `Basic ${base64Auth}`, 'Content-Type': 'application/json' };
}

async function handleResponse(response: Response, errorMessage: string) {
    if (!response.ok) {
        let message = `${errorMessage}. Status: ${response.status}`;
        try {
            const errorBody = await response.json();
            if (errorBody.message) {
                message = errorBody.message;
            }
        } catch (e) {
             message = await response.text();
        }
        console.error("WooCommerce API Error:", message);
        throw new Error(message);
    }
    return response.json();
}

export async function getProducts(page = 1, perPage = 10, category?: string): Promise<{products: WooProduct[], totalPages: number, totalProducts: number}> {
  const headers = getAuthHeaders();
  const categoryParam = category ? `&category=${category}` : '';
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products?per_page=${perPage}&page=${page}${categoryParam}&_embed`, { headers, cache: 'no-store' });

  if (!response.ok) {
     let message = `Failed to fetch products. Status: ${response.status}`;
    try {
        const errorBody = await response.json();
        if (errorBody.message) {
            message = errorBody.message;
        }
    } catch(e) {
        message = await response.text();
    }
    console.error("WooCommerce API Error:", message);
    throw new Error(message);
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
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories?hide_empty=true&orderby=count&order=desc&per_page=100`, { headers, cache: 'no-store' });
    const categories: WooCategory[] = await handleResponse(response, 'Failed to fetch product categories');
    return categories.filter(c => c.slug !== 'uncategorized');
}

export async function getAllProductCategories(): Promise<WooCategory[]> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories?orderby=name&order=asc&per_page=100`, { headers, cache: 'no-store' });
    const categories: WooCategory[] = await handleResponse(response, 'Failed to fetch all product categories');
    return categories.filter(c => c.slug !== 'uncategorized');
}

export async function getProduct(id: number): Promise<WooProduct | null> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/${id}?_embed`, { headers, cache: 'no-store' });

    if (!response.ok) {
        if (response.status === 404) return null;
        await handleResponse(response, `Failed to fetch product ${id}`);
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
    return handleResponse(response, 'Failed to create product');
}

export async function updateProduct(id: number, productData: any): Promise<WooProduct> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(productData)
    });
    return handleResponse(response, `Failed to update product ${id}`);
}

export async function deleteProduct(id: number): Promise<{id: number}> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/${id}?force=true`, {
        method: 'DELETE',
        headers
    });
    const result = await handleResponse(response, `Failed to delete product ${id}`);
    return { id: result.id };
}

export async function createCategory(categoryData: { name: string; slug?: string; parent?: number, image?: { id?: number, src?: string } }): Promise<WooCategory> {
  const headers = getAuthHeaders();
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify(categoryData),
  });
  return handleResponse(response, 'Failed to create category');
}

export async function updateCategory(id: number, categoryData: { name?: string; slug?: string; parent?: number, image?: { id?: number, src?: string } }): Promise<WooCategory> {
  const headers = getAuthHeaders();
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(categoryData),
  });
  return handleResponse(response, `Failed to update category ${id}`);
}

export async function deleteCategory(id: number, force: boolean = true): Promise<WooCategory> {
  const headers = getAuthHeaders();
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories/${id}?force=${force}`, {
    method: 'DELETE',
    headers,
  });
  return handleResponse(response, `Failed to delete category ${id}`);
}

export async function uploadImage(imageName: string, imageData: string): Promise<{id: number, src: string}> {
    const user = process.env.WORDPRESS_AUTH_USER;
    const pass = process.env.WORDPRESS_AUTH_PASS;
    
    const siteUrl = process.env.WOOCOMMERCE_SITE_URL;
    if(!siteUrl || !user || !pass) {
        throw new Error("WordPress site URL or Application Password for media upload are not set in environment variables.");
    }
    
    const wpApiUrl = `${siteUrl}/wp-json/wp/v2`;

    const mimeTypeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/);
    if (!mimeTypeMatch) {
      throw new Error('Invalid Base64 image format. Could not determine MIME type.');
    }
    const mimeType = mimeTypeMatch[1];
    const imageBuffer = Buffer.from(imageData.split(';base64,').pop()!, 'base64');
    
    const sanitizedImageName = imageName.replace(/[^a-zA-Z0-9._-]/g, '_');

    const response = await fetch(`${wpApiUrl}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${sanitizedImageName}"`
      },
      body: imageBuffer
    });

    return handleResponse(response, 'Failed to upload image to WordPress');
}

export async function updateProductBatch(updates: { update: any[] }): Promise<any> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify(updates)
    });
    return handleResponse(response, 'Failed to batch update products');
}

export async function getAllProductTags(): Promise<WooTag[]> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/tags?orderby=count&order=desc&per_page=100`, { headers, cache: 'no-store' });
    return handleResponse(response, "Failed to fetch product tags");
}

export async function getSingleProductTag(id: number): Promise<WooTag | null> {
    const headers = getAuthHeaders();
    // context=edit is crucial for seeing the 'meta' field in the response
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/tags/${id}?context=edit`, { 
        headers, 
        cache: 'no-store' 
    });

    if (!response.ok) {
        if (response.status === 404) return null;
        await handleResponse(response, `Failed to fetch tag ${id}`);
        return null;
    }

    const tagData = await response.json();

    // The key check: does the returned object have the 'meta' property?
    if (tagData && typeof tagData.meta === 'undefined') {
        // Meta field is missing. The server is not configured correctly.
        // We will augment the tag data with a diagnostic error.
        tagData.meta = {
            _internal_error: `The 'meta' field with Yoast SEO data is missing from the API response for this tag. This usually means your WordPress server configuration needs attention. Please check the following:\n\n1. **functions.php**: Ensure the PHP snippet to expose meta fields is in your *active* theme's functions.php file.\n\n2. **Caching**: Clear all server, plugin (e.g., LiteSpeed, WP Rocket), and CDN caches.\n\n3. **Security Plugins**: Temporarily disable plugins like Wordfence to see if they are stripping the 'meta' field from the API response.`
        };
    }
    
    return tagData;
}

export async function updateProductTag(
    id: number, 
    tagData: { 
        name?: string; 
        slug?: string; 
        description?: string; 
        meta?: { [key: string]: any };
    }
): Promise<WooTag> {
    const headers = getAuthHeaders();
    
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/tags/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(tagData),
    });

    return handleResponse(response, `Failed to update product tag ${id}`);
}

export async function createProductTag(tagData: { name: string; slug?: string; description?: string; meta?: { [key: string]: any } }): Promise<WooTag> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/tags`, {
        method: 'POST',
        headers,
        body: JSON.stringify(tagData),
    });
    return handleResponse(response, 'Failed to create product tag');
}

export async function deleteProductTag(id: number, force: boolean = true): Promise<WooTag> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/tags/${id}?force=${force}`, {
        method: 'DELETE',
        headers,
    });
    return handleResponse(response, `Failed to delete product tag ${id}`);
}
