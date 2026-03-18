'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartProvider = CartProvider;
exports.useCart = useCart;
const react_1 = require("react");
const CartContext = (0, react_1.createContext)(null);
function CartProvider({ children }) {
    const [items, setItems] = (0, react_1.useState)([]);
    const addItem = (0, react_1.useCallback)((product) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.product.id === product.id);
            if (existing) {
                return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { product, quantity: 1 }];
        });
    }, []);
    const removeItem = (0, react_1.useCallback)((productId) => {
        setItems((prev) => prev.filter((i) => i.product.id !== productId));
    }, []);
    const updateQuantity = (0, react_1.useCallback)((productId, quantity) => {
        if (quantity <= 0) {
            setItems((prev) => prev.filter((i) => i.product.id !== productId));
            return;
        }
        setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i)));
    }, []);
    const clearCart = (0, react_1.useCallback)(() => setItems([]), []);
    const total = (0, react_1.useMemo)(() => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0), [items]);
    const itemCount = (0, react_1.useMemo)(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
    return (<CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>);
}
function useCart() {
    const ctx = (0, react_1.useContext)(CartContext);
    if (!ctx)
        throw new Error('useCart must be used within CartProvider');
    return ctx;
}
//# sourceMappingURL=cart-context.js.map