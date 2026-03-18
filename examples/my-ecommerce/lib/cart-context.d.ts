import type { Product } from './products';
export interface CartItem {
    product: Product;
    quantity: number;
}
export declare function CartProvider({ children }: {
    children: React.ReactNode;
}): any;
export declare function useCart(): any;
//# sourceMappingURL=cart-context.d.ts.map