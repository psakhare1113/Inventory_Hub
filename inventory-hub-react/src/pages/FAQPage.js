import React, { useState } from 'react';
import { Footer } from '../components/Footer';

export const FAQPage = ({ onNavigate, onFilterByCategory }) => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      category: "Orders & Shipping",
      questions: [
        { q: "How long does shipping take?", a: "Standard shipping takes 5-7 business days. Express shipping is available for 2-3 business days delivery." },
        { q: "Do you ship internationally?", a: "Yes, we ship to most countries worldwide. International shipping times vary by location." },
        { q: "How can I track my order?", a: "Once your order ships, you'll receive a tracking number via email. You can also track orders in your account dashboard." },
        { q: "What are the shipping costs?", a: "We offer free shipping on orders over $150. For orders under $150, shipping costs are calculated at checkout." }
      ]
    },
    {
      category: "Returns & Refunds",
      questions: [
        { q: "What is your return policy?", a: "We accept returns within 30 days of delivery. Items must be unused and in original packaging." },
        { q: "How do I initiate a return?", a: "Contact our customer service team or initiate a return through your account dashboard." },
        { q: "When will I receive my refund?", a: "Refunds are processed within 5-7 business days after we receive your return." },
        { q: "Are return shipping costs covered?", a: "Return shipping is free for defective items. For other returns, customers are responsible for return shipping costs." }
      ]
    },
    {
      category: "Products & Quality",
      questions: [
        { q: "Are your products authentic?", a: "Yes, all our products are 100% authentic and sourced directly from authorized manufacturers." },
        { q: "Do products come with warranty?", a: "Most products come with a 2-year manufacturer warranty. Check individual product pages for specific warranty details." },
        { q: "How do I care for my furniture?", a: "Care instructions are included with each product. Generally, use a soft cloth and avoid harsh chemicals." },
        { q: "Can I customize products?", a: "Some products offer customization options. Contact us for custom orders and special requests." }
      ]
    },
    {
      category: "Payment & Security",
      questions: [
        { q: "What payment methods do you accept?", a: "We accept all major credit cards, PayPal, and Apple Pay." },
        { q: "Is my payment information secure?", a: "Yes, we use industry-standard SSL encryption to protect your payment information." },
        { q: "Can I change my payment method after ordering?", a: "Payment methods cannot be changed after order placement. Please contact us if you need assistance." },
        { q: "Do you offer financing options?", a: "Yes, we offer financing through our partners for purchases over $500." }
      ]
    }
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg">Find answers to common questions about our products and services</p>
        </div>

        <div className="space-y-8">
          {faqs.map((category, catIndex) => (
            <div key={catIndex}>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="w-1 h-8 bg-primary rounded"></span>
                {category.category}
              </h2>
              <div className="space-y-3">
                {category.questions.map((faq, qIndex) => {
                  const index = `${catIndex}-${qIndex}`;
                  const isOpen = openIndex === index;
                  return (
                    <div key={index} className="bg-card border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFAQ(index)}
                        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-secondary/30 transition-colors"
                      >
                        <span className="font-semibold text-foreground pr-4">{faq.q}</span>
                        <svg
                          className={`w-5 h-5 text-primary transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="px-6 py-4 bg-secondary/20 border-t border-border">
                          <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-serif font-bold text-foreground mb-3">Still have questions?</h3>
          <p className="text-muted-foreground mb-6">Can't find the answer you're looking for? Our customer support team is here to help.</p>
          <button
            onClick={() => onNavigate('contact')}
            className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
      <Footer onNavigate={onNavigate} onFilterByCategory={onFilterByCategory} />
    </div>
  );
};
