'use client';

import { createContext, useState, useEffect, ReactNode, useContext } from 'react';

interface Resource {
  id: string;
  name: string;
  type: 'space' | 'equipment';
}

interface CartContextType {
  cart: Resource[];
  addToCart: (resource: Resource) => void;
  removeFromCart: (resourceId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Resource[]>([]);

  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (resource: Resource) => {
    setCart(prevCart => {
      // Prevent adding duplicates
      if (prevCart.find(item => item.id === resource.id)) {
        return prevCart;
      }
      return [...prevCart, resource];
    });
  };

  const removeFromCart = (resourceId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== resourceId));
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
