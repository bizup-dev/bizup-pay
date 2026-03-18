'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartBadge = CartBadge;
const cart_context_1 = require("@/lib/cart-context");
function CartBadge() {
    const { itemCount } = (0, cart_context_1.useCart)();
    if (itemCount === 0)
        return null;
    return <span className="cart-badge">{itemCount}</span>;
}
//# sourceMappingURL=cart-badge.js.map