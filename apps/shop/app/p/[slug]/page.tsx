'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import ShopHeader from '../../components/ShopHeader';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const tenantId = useMemo(() => process.env.NEXT_PUBLIC_STORE_TENANT_ID || '00000000-0000-0000-0000-000000000001', []);

  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${apiUrl}/store/products/${slug}?tenantId=${tenantId}`);
        const data = await response.json();
        setProduct(data);
        setSelectedImageIndex(0);
        if (data.variants && data.variants.length > 0) {
          setSelectedVariant(data.variants[0]);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${apiUrl}/store/categories?tenantId=${tenantId}`);
        if (res.ok) setCategories(await res.json());
      } catch (e) {
        console.error('Failed to fetch categories', e);
      }
    };
    if (slug) {
      fetchProduct();
      fetchCategories();
    }
  }, [slug, apiUrl, tenantId]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addToCart(product.id, quantity, selectedVariant?.id);
      toast('Added to cart', 'success');
    } catch (e) {
      toast((e as Error).message || 'Failed to add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    const canAdd = product.variants?.length ? selectedVariant && selectedVariant.stock >= quantity : true;
    if (!canAdd) {
      toast('Please select a variant with enough stock', 'error');
      return;
    }
    setAdding(true);
    try {
      await addToCart(product.id, quantity, selectedVariant?.id);
      router.push('/checkout');
    } catch (e) {
      toast((e as Error).message || 'Failed to add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-shop-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-shop-accent border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-shop-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-shop-fg mb-4">Product not found</h1>
          <Link href="/products" className="text-shop-accent hover:underline">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-shop-bg">
      <ShopHeader categories={categories} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="mb-6 text-sm text-shop-muted">
          <Link href="/" className="hover:text-shop-fg transition-colors">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/products" className="hover:text-shop-fg transition-colors">Products</Link>
          {product.category && (
            <>
              <span className="mx-2">›</span>
              <Link href={`/products/${product.category.slug}`} className="hover:text-shop-fg transition-colors">
                {product.category.name}
              </Link>
            </>
          )}
          <span className="mx-2">›</span>
          <span className="text-shop-fg">{product.title}</span>
        </nav>

        <div className="bg-shop-card rounded-xl border border-shop-border overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            <div className="relative space-y-3">
              {product.images && product.images.length > 0 ? (
                <>
                  <div className="aspect-square bg-shop-bg rounded-xl overflow-hidden relative">
                    <img
                      key={selectedImageIndex}
                      src={product.images[selectedImageIndex].media.url}
                      alt={`${product.title} – image ${selectedImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {product.images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedImageIndex((i) => (i === 0 ? product.images.length - 1 : i - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                          aria-label="Previous image"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedImageIndex((i) => (i === product.images.length - 1 ? 0 : i + 1))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                          aria-label="Next image"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                  {product.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {product.images.map((img: { media: { url: string } }, idx: number) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                            selectedImageIndex === idx ? 'border-shop-accent ring-2 ring-shop-accent/30' : 'border-shop-border hover:border-shop-muted'
                          }`}
                        >
                          <img src={img.media.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-square bg-shop-placeholder rounded-xl flex flex-col items-center justify-center">
                  <svg className="w-20 h-20 text-shop-placeholder-fg mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                  </svg>
                  <span className="text-sm font-medium text-shop-placeholder-fg uppercase tracking-wider">
                    {product.title?.slice(0, 1) || '?'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <span className="inline-block px-3 py-1 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full text-xs font-semibold mb-4 w-fit">
                In Stock
              </span>
              <h1 className="text-3xl font-bold text-shop-fg mb-4">{product.title}</h1>
              <div className="mb-4">
                <p className="text-3xl font-bold text-shop-fg">
                  {product.currency}{' '}
                  {(
                    selectedVariant?.price != null
                      ? Number(selectedVariant.price)
                      : Number(product.listPrice || product.price)
                  ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                {product.priceDisclaimer && (
                  <p className="text-sm text-shop-muted mt-1">{product.priceDisclaimer}</p>
                )}
              </div>

              {product.variants && product.variants.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-shop-fg mb-3">Select Variant</label>
                  <div className="grid grid-cols-2 gap-3">
                    {product.variants.map((variant: any) => (
                      <button
                        type="button"
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`p-4 border-2 rounded-xl font-semibold transition-all ${
                          selectedVariant?.id === variant.id
                            ? 'border-shop-accent bg-shop-accent/20 text-shop-accent'
                            : 'border-shop-border hover:border-shop-muted text-shop-fg'
                        } ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={variant.stock === 0}
                      >
                        <div>{variant.name}</div>
                        {variant.price != null && (
                          <div className="text-sm font-medium text-shop-fg mt-1">
                            {product.currency} {Number(variant.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        )}
                        <div className="text-xs mt-1">
                          {variant.stock > 0 ? (
                            <span className="text-green-600 dark:text-green-400">{variant.stock} in stock</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">Out of stock</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap mb-6">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-shop-fg shrink-0">Quantity</label>
                  <div className="flex items-center border-2 border-shop-border rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-11 h-11 flex items-center justify-center font-bold text-shop-fg hover:bg-shop-border/50 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={product.variants?.length ? (selectedVariant?.stock ?? 1) : 999}
                      value={quantity}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        const max = product.variants?.length ? (selectedVariant?.stock ?? 1) : 999;
                        setQuantity(isNaN(v) ? 1 : Math.max(1, Math.min(max, v)));
                      }}
                      className="w-14 text-center text-lg font-bold py-2 bg-shop-bg text-shop-fg focus:outline-none focus:ring-0 border-0 border-x border-shop-border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const max = product.variants?.length ? (selectedVariant?.stock ?? 1) : 999;
                        setQuantity((q) => Math.min(max, q + 1));
                      }}
                      className="w-11 h-11 flex items-center justify-center font-bold text-shop-fg hover:bg-shop-border/50 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={adding || (product.variants?.length > 0 && (!selectedVariant || selectedVariant.stock === 0))}
                    className="flex-1 sm:flex-none bg-shop-accent text-white px-6 py-3.5 rounded-xl font-bold hover:bg-shop-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {adding ? 'Adding…' : 'Add to Cart'}
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={adding || (product.variants?.length > 0 && (!selectedVariant || selectedVariant.stock === 0))}
                    className="flex-1 sm:flex-none bg-shop-fg text-shop-bg px-6 py-3.5 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Buy Now
                  </button>
                </div>
              </div>

              <div className="product-description max-w-xl text-sm text-shop-muted leading-relaxed">
                <ReactMarkdown
                  components={{
                    h1: ({ children, ...props }) => <h1 className="text-shop-fg font-bold text-xl mt-0 mb-3" {...props}>{children}</h1>,
                    h2: ({ children, ...props }) => <h2 className="text-shop-fg font-semibold text-base mt-6 mb-2 first:mt-0" {...props}>{children}</h2>,
                    h3: ({ children, ...props }) => <h3 className="text-shop-fg font-medium text-sm mt-4 mb-1" {...props}>{children}</h3>,
                    p: ({ children, ...props }) => <p className="my-2" {...props}>{children}</p>,
                    ul: ({ children, ...props }) => <ul className="list-disc list-inside my-2 space-y-0.5" {...props}>{children}</ul>,
                    li: ({ children, ...props }) => <li {...props}>{children}</li>,
                    strong: ({ children, ...props }) => <strong className="text-shop-fg font-semibold" {...props}>{children}</strong>,
                  }}
                >
                  {product.description || ''}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
