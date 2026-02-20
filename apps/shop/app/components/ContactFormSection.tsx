'use client';

import { useState, useMemo } from 'react';
import { useToast } from '../context/ToastContext';

export default function ContactFormSection() {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const tenantId = useMemo(
    () =>
      process.env.NEXT_PUBLIC_STORE_TENANT_ID || '00000000-0000-0000-0000-000000000001',
    [],
  );
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      toast('Please fill in all fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/store/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: name.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to send message');
      }
      toast("Message sent successfully. We'll get back to you soon.", 'success');
      setName('');
      setPhone('');
      setMessage('');
    } catch (e) {
      toast((e as Error).message || 'Failed to send message', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="mt-12 pt-8 border-t border-shop-border">
      <h2 className="text-2xl font-serif font-bold text-shop-fg mb-2">Contact us</h2>
      <p className="text-shop-muted mb-6">
        Have a question or feedback? Send us a message and we&apos;ll get back to you as soon as possible.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        <div>
          <label htmlFor="about-name" className="block text-sm font-medium text-shop-fg mb-2">
            Name
          </label>
          <input
            id="about-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 bg-shop-card border border-shop-border rounded-lg text-shop-fg placeholder-shop-muted focus:ring-2 focus:ring-shop-accent focus:border-transparent transition-all"
            required
          />
        </div>

        <div>
          <label htmlFor="about-phone" className="block text-sm font-medium text-shop-fg mb-2">
            Phone number
          </label>
          <input
            id="about-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +254 700 123 456"
            className="w-full px-4 py-3 bg-shop-card border border-shop-border rounded-lg text-shop-fg placeholder-shop-muted focus:ring-2 focus:ring-shop-accent focus:border-transparent transition-all"
            required
          />
        </div>

        <div>
          <label htmlFor="about-message" className="block text-sm font-medium text-shop-fg mb-2">
            Message
          </label>
          <textarea
            id="about-message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we help?"
            className="w-full px-4 py-3 bg-shop-card border border-shop-border rounded-lg text-shop-fg placeholder-shop-muted focus:ring-2 focus:ring-shop-accent focus:border-transparent transition-all resize-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 bg-shop-accent text-shop-bg font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending...' : 'Send message'}
        </button>
      </form>
    </section>
  );
}
