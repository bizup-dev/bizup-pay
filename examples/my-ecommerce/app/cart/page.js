'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CartPage;
const link_1 = __importDefault(require("next/link"));
const cart_context_1 = require("@/lib/cart-context");
function CartPage() {
    const { items, removeItem, updateQuantity, total } = (0, cart_context_1.useCart)();
    if (items.length === 0) {
        return (<>
        <h1 className="page-title">Cart</h1>
        <div className="cart-empty">
          <p>Your cart is empty.</p>
          <link_1.default href="/" className="btn btn-primary mt-4" style={{ display: 'inline-flex', marginTop: 16 }}>
            Browse Products
          </link_1.default>
        </div>
      </>);
    }
    return (<>
      <h1 className="page-title">Cart</h1>

      <div>
        {items.map((item) => (<div key={item.product.id} className="cart-item">
            <div className="cart-item-image">{item.product.image}</div>
            <div className="cart-item-info">
              <div className="cart-item-name">{item.product.name}</div>
              <div className="cart-item-price">
                {item.product.price.toFixed(2)} {item.product.currency} each
              </div>
            </div>
            <div className="cart-item-actions">
              <button className="qty-btn" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                -
              </button>
              <span>{item.quantity}</span>
              <button className="qty-btn" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                +
              </button>
              <button className="btn btn-danger" onClick={() => removeItem(item.product.id)}>
                Remove
              </button>
            </div>
          </div>))}
      </div>

      <div className="cart-summary">
        <div className="cart-total">
          <span>Total</span>
          <span>{total.toFixed(2)} ILS</span>
        </div>
        <link_1.default href="/checkout" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          Proceed to Checkout
        </link_1.default>
      </div>
    </>);
}
//# sourceMappingURL=page.js.map