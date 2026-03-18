"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const link_1 = __importDefault(require("next/link"));
const cart_context_1 = require("@/lib/cart-context");
const cart_badge_1 = require("@/components/cart-badge");
require("./globals.css");
exports.metadata = {
    title: 'My E-Commerce — BizUp Pay Demo',
    description: 'Sample e-commerce app demonstrating BizUp Pay integration',
};
function RootLayout({ children }) {
    return (<html lang="en">
      <body>
        <cart_context_1.CartProvider>
          <header className="header">
            <div className="container header-inner">
              <link_1.default href="/" className="logo">
                My<span>Shop</span>
              </link_1.default>
              <nav className="nav">
                <link_1.default href="/">Products</link_1.default>
                <link_1.default href="/cart" className="cart-link">
                  Cart <cart_badge_1.CartBadge />
                </link_1.default>
              </nav>
            </div>
          </header>
          <main className="container">{children}</main>
        </cart_context_1.CartProvider>
      </body>
    </html>);
}
//# sourceMappingURL=layout.js.map