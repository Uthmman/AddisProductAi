import { getProduct } from "@/lib/woocommerce-api";
import ProductForm from "@/components/product-form";
import { notFound } from "next/navigation";
import { WooProduct } from "@/lib/types";

type ProductPageProps = {
  params: { id: string };
};

async function getProductData(id: string): Promise<WooProduct | null> {
  if (id === 'new') {
    return null;
  }

  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    notFound();
  }
  
  const product = await getProduct(productId);

  if (!product) {
    notFound();
  }

  return product;
}

export async function generateMetadata({ params }: ProductPageProps) {
    const isNew = params.id === 'new';
    return {
        title: isNew ? 'New Product | Addis Product AI' : `Edit Product | Addis Product AI`,
    };
}


export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductData(params.id);
  const isNew = params.id === 'new';

  return (
    <div className="container mx-auto py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold font-headline mb-6">
        {isNew ? 'Create New Product' : 'Edit Product'}
      </h1>
      <ProductForm product={product} />
    </div>
  );
}
