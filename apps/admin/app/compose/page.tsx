'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../components/AdminNav';
import { useToast } from '../components/ToastContext';

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
  const [captions, setCaptions] = useState<Record<string, { text: string; hashtags?: string; includeLink: boolean }>>({
    facebook: { text: '', includeLink: true },
    instagram: { text: '', includeLink: true },
    tiktok: { text: '', includeLink: true },
    twitter: { text: '', includeLink: true },
  });
  const [mediaPerDestination, setMediaPerDestination] = useState<Record<string, string[]>>({});
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [showPublishActions, setShowPublishActions] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const { toast } = useToast();

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
          setSelectedDestinations(destData.map((d: { id: string }) => d.id));
        }

        // Fetch products (tenant-scoped)
        const productsResponse = await fetch(`${apiUrl}/products?limit=100`, {
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

      const platformsWithDests = new Set(
        selectedDestinations
          .map((id) => destinations.find((d) => d.id === id)?.type)
          .map((t) => (t ? destTypeToPlatform[t] : null))
          .filter(Boolean) as string[]
      );
      const filteredCaptions = Object.fromEntries(
        Object.entries(captions).filter(([k]) => platformsWithDests.has(k))
      );

      const response = await fetch(`${apiUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          captions: Object.fromEntries(
            Object.entries(filteredCaptions).map(([k, v]) => [
              k,
              { text: v.text, hashtags: v.hashtags || undefined, includeLink: v.includeLink },
            ])
          ),
          destinationIds: selectedDestinations,
          mediaIds: selectedMediaItems.map((m) => m.id),
          mediaPerDestination: Object.keys(mediaPerDestination).length > 0 ? mediaPerDestination : undefined,
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
      toast('Failed to create post. Please try again.', 'error');
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
      toast('Failed to publish. Please try again.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!createdPostId || !scheduleDateTime) {
      toast('Please select a date and time.', 'error');
      return;
    }
    const scheduledAt = new Date(scheduleDateTime).toISOString();
    if (new Date(scheduledAt) <= new Date()) {
      toast('Please select a future date and time.', 'error');
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
      toast('Failed to schedule. Please try again.', 'error');
    } finally {
      setScheduling(false);
    }
  };

  const CAPTION_LIMITS: Record<string, number> = {
    facebook: 5000,
    instagram: 2200,
    tiktok: 2200,
    twitter: 280,
  };
  const PLATFORM_LABELS: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    twitter: 'X (Twitter)',
  };
  const destTypeToPlatform: Record<string, string> = {
    facebook_page: 'facebook',
    instagram_business: 'instagram',
    tiktok_account: 'tiktok',
    twitter_account: 'twitter',
  };

  const getCaptionLength = (platform: string) => captions[platform]?.text?.length || 0;
  const getCaptionLimit = (platform: string) => CAPTION_LIMITS[platform as keyof typeof CAPTION_LIMITS];

  const STEPS = ['Client', 'Media', 'Destinations', 'Content', 'Products'];

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav title="hhourssop · Create Post" backHref="/dashboard" />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Cancel
          </Link>
          {step >= 4 && (
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedClientId}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving…' : 'Save post'}
            </button>
          )}
        </div>
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
        {/* Slim progress */}
        <div className="flex gap-1 mb-6">
          {STEPS.map((label, s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                step > s ? 'bg-blue-600' : step === s ? 'bg-blue-500' : 'bg-slate-200'
              }`}
              title={label}
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 mb-6">{STEPS[step]}</p>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {/* Step 0: Client Selection */}
          {step === 0 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Who is this post for?</h2>
              {clients.length === 0 ? (
                <div className="text-center py-12 rounded-lg bg-slate-50">
                  <p className="text-slate-600 mb-4">No clients yet</p>
                  <Link href="/clients" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    Add a client →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setStep(1);
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-colors group"
                    >
                      <span className="font-medium text-slate-900">{client.name}</span>
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
              <p className="text-sm text-gray-600 mb-4">Click &quot;Add Media&quot; to upload images or videos (PNG, JPEG, MP4, max 50MB). You can select multiple files at once.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <input
                  type="file"
                  id="media-upload"
                  accept="image/png,image/jpeg,image/jpg,video/mp4"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = '';
                    if (files.length === 0 || selectedMediaItems.length >= 4) return;
                    const remaining = Math.min(files.length, 4 - selectedMediaItems.length);
                    const toUpload = files.slice(0, remaining);
                    setMediaError('');
                    setMediaUploading(true);
                    const token = localStorage.getItem('accessToken');
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
                    try {
                      for (const file of toUpload) {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 120_000);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          if (selectedClientId) formData.append('clientId', selectedClientId);
                          const res = await fetch(`${apiUrl}/media/upload`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                            body: formData,
                            signal: controller.signal,
                          });
                          clearTimeout(timeoutId);
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            throw new Error(err.message || `Upload failed: ${file.name}`);
                          }
                          const data = await res.json();
                          setSelectedMediaItems((prev) => [...prev, { id: data.mediaId, url: data.url }]);
                        } catch (fileErr: unknown) {
                          if (fileErr instanceof Error && fileErr.name === 'AbortError') {
                            throw new Error('Upload timed out. Try smaller files or check your connection.');
                          }
                          throw fileErr;
                        }
                      }
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
                          {mediaUploading && i === selectedMediaItems.length ? (
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

          {/* Step 2: Destinations + Media per platform */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Destinations & Media</h2>
              <p className="text-sm text-gray-600 mb-6">Post will go to all connected accounts. Choose which media to use for each platform.</p>
              {destinations.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl mb-6">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <p className="text-gray-600 mb-4">No destinations available. Connect social accounts for this client first.</p>
                  <Link href={`/clients/${selectedClientId}`} className="inline-block text-blue-600 hover:text-blue-700 font-semibold">
                    Connect accounts →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {destinations.map((dest) => {
                    const platform = destTypeToPlatform[dest.type] || dest.type;
                    const currentMedia = mediaPerDestination[dest.id] ?? selectedMediaItems.map((m) => m.id);
                    return (
                      <div key={dest.id} className="p-4 border-2 border-blue-200 bg-blue-50/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="font-bold text-gray-900">{dest.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full capitalize">
                            {PLATFORM_LABELS[platform] || platform}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">Media for this platform:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedMediaItems.map((item) => {
                            const isChecked = currentMedia.includes(item.id);
                            return (
                              <label
                                key={item.id}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                                  isChecked ? 'border-blue-600 bg-white' : 'border-gray-200 bg-white'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...currentMedia, item.id]
                                      : currentMedia.filter((id) => id !== item.id);
                                    if (next.length === 0) return;
                                    setMediaPerDestination((prev) => ({ ...prev, [dest.id]: next }));
                                  }}
                                  className="rounded border-gray-300 text-blue-600"
                                />
                                {item.url?.includes('.mp4') ? (
                                  <span className="text-xs">Video</span>
                                ) : (
                                  <img src={item.url} alt="" className="w-8 h-8 rounded object-cover" />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-3.5 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={destinations.length === 0}
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
              <p className="text-sm text-gray-600 mb-6">Add captions and hashtags for each platform. Each platform has different character limits.</p>
              <div className="space-y-6">
                {['facebook', 'instagram', 'tiktok', 'twitter'].map((platform) => {
                  const isSelected = selectedDestinations.some(
                    (destId) => destTypeToPlatform[destinations.find((d) => d.id === destId)?.type || ''] === platform,
                  );
                  if (!isSelected) return null;

                  return (
                    <div key={platform} className="border-2 border-gray-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {PLATFORM_LABELS[platform]?.charAt(0) || platform.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{PLATFORM_LABELS[platform] || platform}</h3>
                            <p className="text-xs text-gray-500">
                              {getCaptionLength(platform)} / {getCaptionLimit(platform)} characters
                            </p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={captions[platform]?.includeLink ?? true}
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
                        placeholder={`Write your ${PLATFORM_LABELS[platform] || platform} caption...`}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[100px] resize-none mb-3"
                      />
                      <input
                        type="text"
                        value={captions[platform]?.hashtags || ''}
                        onChange={(e) =>
                          setCaptions({
                            ...captions,
                            [platform]: { ...captions[platform], hashtags: e.target.value },
                          })
                        }
                        placeholder="#hashtags #example"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {getCaptionLength(platform) > getCaptionLimit(platform) * 0.9 && (
                        <p className="text-xs text-orange-600 mt-2">Approaching character limit</p>
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
