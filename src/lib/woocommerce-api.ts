import { WooProduct } from './types';

// MOCK DATA - Replace with actual API calls

let mockProducts: WooProduct[] = [
  {
    id: 1,
    name: 'Hand-woven Cotton Scarf',
    price: '850.00',
    regular_price: '850.00',
    sale_price: '',
    stock_status: 'instock',
    images: [{ id: 101, src: 'https://picsum.photos/seed/1/600/600', alt: 'A beautiful hand-woven scarf' }],
    slug: 'hand-woven-cotton-scarf',
    permalink: '', date_created: '', date_modified: '', type: 'simple', status: 'publish', featured: false, catalog_visibility: 'visible', description: '', short_description: '', sku: '', on_sale: false, stock_quantity: 10, attributes: [], meta_data: [], tags: []
  },
  {
    id: 2,
    name: 'Leather Messenger Bag',
    price: '2500.00',
    regular_price: '2500.00',
    sale_price: '',
    stock_status: 'instock',
    images: [{ id: 102, src: 'https://picsum.photos/seed/2/600/600', alt: 'A brown leather bag' }],
    slug: 'leather-messenger-bag',
    permalink: '', date_created: '', date_modified: '', type: 'simple', status: 'publish', featured: false, catalog_visibility: 'visible', description: '', short_description: '', sku: '', on_sale: false, stock_quantity: 5, attributes: [], meta_data: [], tags: []
  },
  {
    id: 3,
    name: 'Artisanal Coffee Beans',
    price: '500.00',
    regular_price: '500.00',
    sale_price: '',
    stock_status: 'outofstock',
    images: [{ id: 103, src: 'https://picsum.photos/seed/3/600/600', alt: 'A bag of coffee beans' }],
    slug: 'artisanal-coffee-beans',
    permalink: '', date_created: '', date_modified: '', type: 'simple', status: 'publish', featured: false, catalog_visibility: 'visible', description: '', short_description: '', sku: '', on_sale: false, stock_quantity: 0, attributes: [], meta_data: [], tags: []
  },
];

let nextId = 4;

const getAuthHeaders = () => {
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
    if (!consumerKey || !consumerSecret) {
        console.warn("WooCommerce API credentials are not set. Using mock data.");
        return null;
    }
    const base64Auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    return { 'Authorization': `Basic ${base64Auth}`, 'Content-Type': 'application/json' };
}

// NOTE: In a real app, you would replace these mocks with `fetch` calls to your WooCommerce API.
// e.g., const response = await fetch(`${process.env.WOOCOMMERCE_API_URL}/products?per_page=${perPage}&page=${page}`, { headers: getAuthHeaders() });

export async function getProducts(page = 1, perPage = 10): Promise<{products: WooProduct[], totalPages: number}> {
  console.log(`Mock Fetch: getProducts(page: ${page}, perPage: ${perPage})`);
  await new Promise(res => setTimeout(res, 500)); // Simulate network delay
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedProducts = mockProducts.slice(start, end);
  return {
    products: paginatedProducts,
    totalPages: Math.ceil(mockProducts.length / perPage),
  };
}

export async function getProduct(id: number): Promise<WooProduct | null> {
  console.log(`Mock Fetch: getProduct(id: ${id})`);
  await new Promise(res => setTimeout(res, 300));
  const product = mockProducts.find(p => p.id === id);
  return product || null;
}

export async function createProduct(productData: any): Promise<WooProduct> {
  console.log('Mock Fetch: createProduct', productData);
  await new Promise(res => setTimeout(res, 500));
  const newProduct: WooProduct = {
    id: nextId++,
    name: productData.name || 'New Product',
    price: productData.regular_price || '0',
    regular_price: productData.regular_price || '0',
    sale_price: '',
    stock_status: productData.stock_status || 'instock',
    images: productData.images || [],
    ...productData,
  };
  mockProducts.unshift(newProduct);
  return newProduct;
}

export async function updateProduct(id: number, productData: any): Promise<WooProduct> {
  console.log(`Mock Fetch: updateProduct(id: ${id})`, productData);
  await new Promise(res => setTimeout(res, 500));
  let product = mockProducts.find(p => p.id === id);
  if (product) {
    product = { ...product, ...productData, id };
    mockProducts = mockProducts.map(p => (p.id === id ? product : p));
    return product;
  }
  throw new Error("Product not found");
}

export async function uploadImage(imageName: string, imageB64: string): Promise<{id: number, src: string}> {
    console.log(`Mock Upload: uploadImage(${imageName})`);
    await new Promise(res => setTimeout(res, 1000));
    
    // In a real app, you would upload to WordPress Media Endpoint here.
    // const wpApiUrl = process.env.WORDPRESS_API_URL;
    // const user = process.env.WORDPRESS_AUTH_USER;
    // const pass = process.env.WORDPRESS_AUTH_PASS;
    //
    // const res = await fetch(`${wpApiUrl}/media`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
    //     'Content-Type': 'image/jpeg', // or png, etc.
    //     'Content-Disposition': `attachment; filename="${imageName}"`
    //   },
    //   body: Buffer.from(imageB64.split(',')[1], 'base64')
    // });
    // const data = await res.json();
    // return { id: data.id, src: data.source_url };

    const mockId = Math.floor(Math.random() * 1000);
    return { id: mockId, src: `https://picsum.photos/seed/${mockId}/600/600` };
}
