"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomePage;
const products_1 = require("@/lib/products");
const product_card_1 = require("@/components/product-card");
function HomePage() {
    return (<>
      <h1 className="page-title">Products</h1>
      <div className="product-grid">
        {products_1.products.map((product) => (<product_card_1.ProductCard key={product.id} product={product}/>))}
      </div>
    </>);
}
//# sourceMappingURL=page.js.map