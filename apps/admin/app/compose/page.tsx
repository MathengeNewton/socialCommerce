'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ComposePage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // Start at step 0 for client selection
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [destinations, setDestinations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedMediaItems, setSelectedMediaItems] = useState<Array<{ id: string; url: string }>>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string>('');
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [primaryProduct, setPrimaryProduct] = useState<string>('');
  const [captions, setCaptions] = useState<Record<string, { text: string; includeLink: boolean }>>({
    facebook: { text: '', includeLink: true },
    instagram: { text: '', includeLink: true },
    twitter: { text: '', includeLink: true },
    pinterest: { text: '', includeLink: true },
  });
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [showPublishActions, setShowPublishActions] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
        const clientsResponse = await fetch(`${apiUrl}/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          setClients(clientsData);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };

    fetchClients();
  }, [router]);

  useEffect(() => {
    if (!selectedClientId) return;

    const fetchData = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
        
        // Fetch destinations filtered by client
        const destResponse = await fetch(`${apiUrl}/destinations?clientId=${encodeURIComponent(selectedClientId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (destResponse.ok) {
          const destData = await destResponse.json();
          setDestinations(destData);
        }

        // Fetch products filtered by client
        const productsResponse = await fetch(`${apiUrl}/products?clientId=${encodeURIComponent(selectedClientId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [selectedClientId]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';

      const response = await fetch(`${apiUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          captions,
          destinationIds: selectedDestinations,
          mediaIds: selectedMediaItems.map((m) => m.id),
          productIds: selectedProducts.length > 0 ? selectedProducts : undefined,
          primaryProductId: primaryProduct || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const created = await response.json();
      setCreatedPostId(created.id);
      setShowPublishActions(true);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNow = async () => {
    if (!createdPostId) return;
    setPublishing(true);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
      const response = await fetch(`${apiUrl}/posts/${createdPostId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to publish');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Failed to publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!createdPostId || !scheduleDateTime) {
      alert('Please select a date and time.');
      return;
    }
    const scheduledAt = new Date(scheduleDateTime).toISOString();
    if (new Date(scheduledAt) <= new Date()) {
      alert('Please select a future date and time.');
      return;
    }
    setScheduling(true);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
      const response = await fetch(`${apiUrl}/posts/${createdPostId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scheduledAt }),
      });
      if (!response.ok) throw new Error('Failed to schedule');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error scheduling:', error);
      alert('Failed to schedule. Please try again.');
    } finally {
      setScheduling(false);
    }
  };

  const CAPTION_LIMITS = {
    facebook: 5000,
    instagram: 2200,
    twitter: 280,
    pinterest: 500,
  };

  const getCaptionLength = (platform: string) => captions[platform]?.text?.length || 0;
  const getCaptionLimit = (platform: string) => CAPTION_LIMITS[platform as keyof typeof CAPTION_LIMITS];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                hhourssop · Create Post
              </h1>
            </Link>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || step < 4 || !selectedClientId}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showPublishActions && createdPostId ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Post saved</h2>
                <p className="text-sm text-gray-500">Choose when to publish</p>
              </div>
            </div>
            <div className="space-y-6">
              <button
                type="button"
                onClick={handlePublishNow}
                disabled={publishing}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? 'Publishing...' : 'Publish now'}
              </button>
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Or schedule for later</label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={scheduling || !scheduleDateTime}
                    className="px-4 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {scheduling ? '…' : 'Schedule'}
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-6 text-center">
              <Link
                href="/dashboard"
                className="text-sm text-gray-500 hover:text-blue-600"
              >
                Skip and go to dashboard →
              </Link>
            </p>
          </div>
        ) : (
          <>
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[0, 1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                      step >= s
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step > s ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s
                    )}
                  </div>
                  <p className={`text-xs mt-2 font-medium ${step >= s ? 'text-gray-900' : 'text-gray-500'}`}>
                    {s === 0 && 'Client'}
                    {s === 1 && 'Media'}
                    {s === 2 && 'Destinations'}
                    {s === 3 && 'Content'}
                    {s === 4 && 'Products'}
                  </p>
                </div>
                {s < 4 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded ${
                      step > s ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Step 0: Client Selection */}
          {step === 0 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Client</h2>
              {clients.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl mb-6">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-600 mb-4">No clients available</p>
                  <Link
                    href="/clients"
                    className="inline-block text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Create a client →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setStep(1);
                      }}
                      className="p-6 border-2 rounded-xl text-left transition-all hover:shadow-lg border-gray-200 hover:border-blue-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-lg text-gray-900">{client.name}</p>
                          <p className="text-sm text-gray-500 font-mono mt-1">{client.id.slice(0, 8)}...</p>
                        </div>
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Media Selection */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Media</h2>
              {mediaError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {mediaError}
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">Click &quot;Add Media&quot; to upload an image or video from your device (PNG, JPEG, MP4, max 50MB).</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <input
                  type="file"
                  id="media-upload"
                  accept="image/png,image/jpeg,image/jpg,video/mp4"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file || selectedMediaItems.length >= 4) return;
                    setMediaError('');
                    setMediaUploading(true);
                    try {
                      const token = localStorage.getItem('accessToken');
                      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
                      const formData = new FormData();
                      formData.append('file', file);
                      if (selectedClientId) formData.append('clientId', selectedClientId);
                      const res = await fetch(`${apiUrl}/media/upload`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData,
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || 'Upload failed');
                      }
                      const data = await res.json();
                      setSelectedMediaItems((prev) => [...prev, { id: data.mediaId, url: data.url }]);
                    } catch (err: unknown) {
                      setMediaError(err instanceof Error ? err.message : 'Upload failed');
                    } finally {
                      setMediaUploading(false);
                    }
                  }}
                />
                {[0, 1, 2, 3].map((i) => {
                  const item = selectedMediaItems[i];
                  const isImage = item?.url && !item.url.includes('.mp4');
                  return (
                    <div
                      key={item ? item.id : `empty-${i}`}
                      className="aspect-square border-2 rounded-xl overflow-hidden flex items-center justify-center bg-gray-50 relative group"
                    >
                      {item ? (
                        <>
                          {isImage ? (
                            <img src={item.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-4">
                              <svg className="w-12 h-12 text-purple-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <p className="text-xs text-gray-600">Video</p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedMediaItems((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            aria-label="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <label
                          htmlFor="media-upload"
                          className={`w-full h-full flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-colors ${mediaUploading ? 'pointer-events-none opacity-70' : ''}`}
                        >
                          {mediaUploading ? (
                            <>
                              <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                              <p className="text-xs text-gray-600">Uploading…</p>
                            </>
                          ) : (
                            <>
                              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <p className="text-xs text-gray-500">Add Media</p>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3.5 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedMediaItems.length === 0}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Continue to Destinations
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Destinations */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Destinations</h2>
              {destinations.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl mb-6">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <p className="text-gray-600 mb-4">No destinations available</p>
                  <Link
                    href="/settings"
                    className="inline-block text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Connect social accounts →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {destinations.map((dest) => (
                    <button
                      key={dest.id}
                      onClick={() => {
                        if (selectedDestinations.includes(dest.id)) {
                          setSelectedDestinations(selectedDestinations.filter((id) => id !== dest.id));
                        } else {
                          setSelectedDestinations([...selectedDestinations, dest.id]);
                        }
                      }}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        selectedDestinations.includes(dest.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{dest.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{dest.type.replace('_', ' ')}</p>
                        </div>
                        {selectedDestinations.includes(dest.id) && (
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3.5 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedDestinations.length === 0}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Continue to Content
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Captions */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Write Captions</h2>
              <div className="space-y-6">
                {['facebook', 'instagram', 'twitter', 'pinterest'].map((platform) => {
                  const isSelected = selectedDestinations.some(
                    (destId) => destinations.find((d) => d.id === destId)?.type.includes(platform),
                  );
                  if (!isSelected) return null;

                  return (
                    <div key={platform} className="border-2 border-gray-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold capitalize">
                            {platform.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 capitalize">{platform}</h3>
                            <p className="text-xs text-gray-500">
                              {getCaptionLength(platform)} / {getCaptionLimit(platform)} characters
                            </p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={captions[platform]?.includeLink || false}
                            onChange={(e) =>
                              setCaptions({
                                ...captions,
                                [platform]: { ...captions[platform], includeLink: e.target.checked },
                              })
                            }
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Include product link</span>
                        </label>
                      </div>
                      <textarea
                        value={captions[platform]?.text || ''}
                        onChange={(e) =>
                          setCaptions({
                            ...captions,
                            [platform]: { ...captions[platform], text: e.target.value },
                          })
                        }
                        maxLength={getCaptionLimit(platform)}
                        placeholder={`Write your ${platform} caption...`}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[120px] resize-none"
                      />
                      {getCaptionLength(platform) > getCaptionLimit(platform) * 0.9 && (
                        <p className="text-xs text-orange-600 mt-2">
                          Approaching character limit
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3.5 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                >
                  Continue to Products
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Products */}
          {step === 4 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Link Products (Optional)</h2>
              {products.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl mb-6">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-gray-600 mb-4">No products available</p>
                  <Link
                    href="/products"
                    className="inline-block text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Create products →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (selectedProducts.includes(product.id)) {
                          setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
                          if (primaryProduct === product.id) {
                            setPrimaryProduct('');
                          }
                        } else {
                          setSelectedProducts([...selectedProducts, product.id]);
                          if (!primaryProduct) {
                            setPrimaryProduct(product.id);
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (selectedProducts.includes(product.id)) {
                            setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
                            if (primaryProduct === product.id) setPrimaryProduct('');
                          } else {
                            setSelectedProducts([...selectedProducts, product.id]);
                            if (!primaryProduct) setPrimaryProduct(product.id);
                          }
                        }
                      }}
                      className={`w-full p-4 border-2 rounded-xl text-left transition-all cursor-pointer ${
                        selectedProducts.includes(product.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-gray-900">{product.title}</p>
                            {primaryProduct === product.id && (
                              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-semibold">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                          <p className="text-lg font-bold text-blue-600 mt-2">
                            {product.currency} {product.price}
                          </p>
                        </div>
                        {selectedProducts.includes(product.id) && (
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center ml-4">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {selectedProducts.includes(product.id) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryProduct(product.id);
                          }}
                          className={`mt-3 text-sm font-semibold ${
                            primaryProduct === product.id
                              ? 'text-blue-600'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          {primaryProduct === product.id ? '✓ Primary Product' : 'Set as Primary'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3.5 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? 'Saving...' : 'Save Post'}
                </button>
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </main>
    </div>
  );
}
