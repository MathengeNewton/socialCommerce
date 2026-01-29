'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/store/products/${slug}`);
        const data = await response.json();
        setProduct(data);
        if (data.variants && data.variants.length > 0) {
          setSelectedVariant(data.variants[0]);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const addToCart = () => {
    // Cart functionality will be implemented later
    alert('Add to cart functionality coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link href="/products" className="text-blue-600 hover:text-blue-700">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/products"
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to products</span>
            </Link>
            <Link
              href="/cart"
              className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">0</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Product Image */}
            <div className="relative">
              {product.images && product.images.length > 0 ? (
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-lg">
                  <img
                    src={product.images[0].media.url}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <div className="mb-6">
                <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold mb-4">
                  In Stock
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">{product.title}</h1>
                <div className="mb-6">
                  <div className="flex items-baseline gap-3 mb-2">
                    <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {product.currency} {Number(product.listPrice || product.price).toFixed(2)}
                    </p>
                  </div>
                  {product.priceDisclaimer && (
                    <p className="text-sm text-gray-500 italic">{product.priceDisclaimer}</p>
                  )}
                </div>
              </div>

              <p className="text-gray-600 mb-8 leading-relaxed">{product.description}</p>

              {product.variants && product.variants.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Select Variant</label>
                  <div className="grid grid-cols-2 gap-3">
                    {product.variants.map((variant: any) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`p-4 border-2 rounded-xl font-semibold transition-all ${
                          selectedVariant?.id === variant.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        } ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={variant.stock === 0}
                      >
                        <div>{variant.name}</div>
                        <div className="text-xs mt-1">
                          {variant.stock > 0 ? (
                            <span className="text-green-600">{variant.stock} in stock</span>
                          ) : (
                            <span className="text-red-600">Out of stock</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Quantity</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={selectedVariant?.stock || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(selectedVariant?.stock || 1, parseInt(e.target.value) || 1)))}
                    className="w-20 text-center text-xl font-bold border-2 border-gray-200 rounded-xl py-2 focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(selectedVariant?.stock || 1, quantity + 1))}
                    className="w-12 h-12 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={addToCart}
                disabled={!selectedVariant || selectedVariant.stock === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Add to Cart</span>
              </button>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Free shipping</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>30-day returns</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
