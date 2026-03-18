'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductCard = ProductCard;
const cart_context_1 = require("@/lib/cart-context");
function ProductCard({ product }) {
    const { addItem } = (0, cart_context_1.useCart)();
    return (<div className="product-card">
      <div className="product-image">{product.image}</div>
      <div className="product-name">{product.name}</div>
      <div className="product-desc">{product.description}</div>
      <div className="product-footer">
        <div className="product-price">
          {product.price.toFixed(2)} {product.currency}
        </div>
        <button className="btn btn-primary" onClick={() => addItem(product)}>
          Add to Cart
        </button>
      </div>
    </div>);
}
//# sourceMappingURL=product-card.js.map