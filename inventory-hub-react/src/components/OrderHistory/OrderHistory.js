import React, { useState } from "react";
import { useOrders } from "../../hooks/useOrders";
import "./OrderHistory.css";

export default function OrderHistory() {
  const { data: orders, isLoading } = useOrders();
  const [reviewingItem, setReviewingItem] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  if (isLoading) {
    return (
      <div className="order-loading">
        <div className="loader"></div>
      </div>
    );
  }

  const typedOrders = orders || [];

  const handleSubmitReview = (orderId, itemId) => {
    console.log("Review submitted:", { orderId, itemId, rating, reviewText });
    setReviewingItem(null);
    setRating(0);
    setReviewText("");
  };

  return (
    <div className="order-history-container">
      <div className="order-header">
        <h1 className="order-title">Your Orders</h1>
        <div className="search-container">
          <input 
            placeholder="Search orders" 
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      <div className="orders-list">
        {typedOrders.length === 0 ? (
          <div className="empty-orders">
            <div className="empty-icon">📦</div>
            <h3>No orders yet</h3>
            <p>Start shopping to see your orders here.</p>
            <button className="start-shopping-btn" onClick={() => window.location.href = '/'}>
              Start Shopping
            </button>
          </div>
        ) : (
          typedOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div className="order-info">
                  <div className="info-item">
                    <div className="info-label">Order Placed</div>
                    <div className="info-value">{new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Total</div>
                    <div className="info-value">${Number(order.totalAmount).toFixed(2)}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Ship To</div>
                    <div className="info-value ship-to">
                      {order.shippingAddress?.fullName || 'N/A'}
                    </div>
                  </div>
                  <div className="order-actions">
                    <div className="order-number">Order # {order.id}</div>
                    <div className="action-links">
                      <a href={`/orders/${order.id}`} className="action-link">View details</a>
                      <span className="separator">|</span>
                      <a href="#" className="action-link">Invoice</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-content">
                <div className="order-main">
                  <div className="order-items">
                    <h3 className="delivery-status">
                      {order.status === "delivered" ? "Delivered" : "Arriving Soon"}
                      {order.estimatedDelivery && (
                        <span className="delivery-date">
                          {new Date(order.estimatedDelivery).toLocaleDateString()}
                        </span>
                      )}
                    </h3>

                    {order.items?.map((item) => (
                      <div key={item.id} className="order-item">
                        <img 
                          src={item.product?.imageUrl || '/placeholder.jpg'} 
                          alt={item.product?.name || 'Product'} 
                          className="item-image"
                        />
                        <div className="item-details">
                          <a href={`/product/${item.productId}`} className="item-name">
                            {item.product?.name || 'Product Name'}
                          </a>
                          <p className="item-seller">Sold by: LuxeCart Inc.</p>
                          <div className="item-price">
                            ${Number(item.priceAtTime).toFixed(2)}
                          </div>
                          <button className="buy-again-btn">
                            <span className="rotate-icon">↻</span>
                            Buy it again
                          </button>

                          {reviewingItem === `${order.id}-${item.id}` ? (
                            <div className="review-form">
                              <div className="review-rating">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    className={`star ${rating >= star ? 'filled' : ''}`}
                                    onClick={() => setRating(star)}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <textarea
                                className="review-textarea"
                                placeholder="Share your experience with this product..."
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                rows={4}
                              />
                              <div className="review-actions">
                                <button 
                                  className="review-submit-btn"
                                  onClick={() => handleSubmitReview(order.id, item.id)}
                                >
                                  Submit Review
                                </button>
                                <button 
                                  className="review-cancel-btn"
                                  onClick={() => {
                                    setReviewingItem(null);
                                    setRating(0);
                                    setReviewText("");
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              className="write-review-btn"
                              onClick={() => setReviewingItem(`${order.id}-${item.id}`)}
                            >
                              ✍️ Write a review
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="order-actions-sidebar">
                    <button className="action-btn primary">Track package</button>
                    <button className="action-btn secondary">Leave seller feedback</button>
                    <button className="action-btn ghost">Archive order</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
