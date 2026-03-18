export interface Product {
  id: string
  name: string
  description: string
  price: number
  currency: string
  image: string
}

export const products: Product[] = [
  {
    id: 'wireless-earbuds',
    name: 'Wireless Earbuds Pro',
    description: 'Premium noise-cancelling wireless earbuds with 24h battery life.',
    price: 249.90,
    currency: 'ILS',
    image: '🎧',
  },
  {
    id: 'smart-watch',
    name: 'Smart Watch Ultra',
    description: 'Fitness tracking, heart rate monitor, and GPS in a sleek design.',
    price: 899.90,
    currency: 'ILS',
    image: '⌚',
  },
  {
    id: 'portable-charger',
    name: 'Power Bank 20K',
    description: 'Ultra-fast 20,000mAh portable charger with USB-C and wireless charging.',
    price: 179.90,
    currency: 'ILS',
    image: '🔋',
  },
]
