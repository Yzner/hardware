// import { useEffect, useState } from 'react';
// import { supabase } from '../../lib/supabase';
// import { useAuth } from '../../contexts/AuthContext';
// import { ShoppingCart, Plus, Minus, Trash2, Loader2, Search, Receipt } from 'lucide-react';

// interface Product {
//   id: string;
//   name: string;
//   price: number;
//   unit: string;
//   branch_stock: { stock: number }[];
// }

// interface CartItem {
//   product: Product;
//   quantity: number;
// }

// export default function POSInterface() {
//   const { profile } = useAuth();
//   const [products, setProducts] = useState<Product[]>([]);
//   const [cart, setCart] = useState<CartItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [checkingOut, setCheckingOut] = useState(false);
//   const [lastSale, setLastSale] = useState<{ id: string; total: number } | null>(null);

//   useEffect(() => {
//     loadProducts();
//   }, []);

//   const loadProducts = async () => {
//     const { data } = await supabase
//       .from('products')
//       .select('*, branch_stock(stock)')
//       .eq('branch_stock.branch_id', profile?.id)
//       .order('name');
//     setProducts(data || []);
//     setLoading(false);
//   };

//   const addToCart = (product: Product) => {
//     const existing = cart.find((c) => c.product.id === product.id);
//     if (existing) {
//       setCart(cart.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
//     } else {
//       setCart([...cart, { product, quantity: 1 }]);
//     }
//     setLastSale(null);
//   };

//   const updateQuantity = (productId: string, delta: number) => {
//     setCart(cart.map((c) => {
//       if (c.product.id !== productId) return c;
//       const newQty = c.quantity + delta;
//       return newQty > 0 ? { ...c, quantity: newQty } : c;
//     }).filter((c) => c.quantity > 0));
//   };

//   const removeFromCart = (productId: string) => {
//     setCart(cart.filter((c) => c.product.id !== productId));
//   };

//   const cartTotal = cart.reduce((sum, c) => sum + Number(c.product.price) * c.quantity, 0);

//   const handleCheckout = async () => {
//     if (cart.length === 0) return;
//     setCheckingOut(true);

//     try {
//       const { data: { session } } = await supabase.auth.getSession();
//       const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-sale`, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${session?.access_token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           items: cart.map((c) => ({
//             product_id: c.product.id,
//             quantity: c.quantity,
//           })),
//         }),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error);

//       setLastSale({ id: data.sale_id, total: data.total });
//       setCart([]);
//       loadProducts();
//     } catch (err: any) {
//       alert(err.message || 'Checkout failed');
//     } finally {
//       setCheckingOut(false);
//     }
//   };

//   const filtered = products.filter((p) =>
//     p.name.toLowerCase().includes(search.toLowerCase())
//   );

//   if (loading) {
//     return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;
//   }

//   return (
//     <div className="flex gap-6 h-[calc(100vh-8rem)]">
//       {/* Product grid */}
//       <div className="flex-1 flex flex-col min-w-0">
//         <h1 className="text-2xl font-bold text-slate-900 mb-4">Point of Sale</h1>

//         <div className="relative mb-4">
//           <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
//           <input
//             type="text"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             placeholder="Search products..."
//           />
//         </div>

//         <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-3 content-start">
//           {filtered.map((p) => {
//             const stock = p.branch_stock?.[0]?.stock ?? 0;
//             const inCart = cart.find((c) => c.product.id === p.id);
//             return (
//               <button
//                 key={p.id}
//                 onClick={() => stock > 0 && addToCart(p)}
//                 disabled={stock <= 0}
//                 className={`relative bg-white rounded-xl border p-4 text-left transition-all ${
//                   inCart ? 'border-blue-300 shadow-md' : stock > 0 ? 'border-slate-200 hover:border-blue-200 hover:shadow-sm' : 'border-slate-100 opacity-50 cursor-not-allowed'
//                 }`}
//               >
//                 {inCart && (
//                   <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
//                     {inCart.quantity}
//                   </span>
//                 )}
//                 <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
//                 <p className="text-lg font-bold text-blue-600 mt-1">${Number(p.price).toFixed(2)}</p>
//                 <p className="text-xs text-slate-400 mt-1">{stock} {p.unit} left</p>
//               </button>
//             );
//           })}
//           {filtered.length === 0 && (
//             <div className="col-span-full py-8 text-center text-slate-400">No products found</div>
//           )}
//         </div>
//       </div>

//       {/* Cart */}
//       <div className="w-96 bg-white rounded-xl border border-slate-200 flex flex-col">
//         <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
//           <ShoppingCart className="w-5 h-5 text-blue-600" />
//           <h2 className="font-semibold text-slate-900">Cart</h2>
//           <span className="ml-auto text-xs text-slate-400">{cart.length} items</span>
//         </div>

//         <div className="flex-1 overflow-y-auto p-4 space-y-3">
//           {cart.length === 0 ? (
//             <div className="text-center text-slate-400 py-8">
//               <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
//               <p className="text-sm">Cart is empty</p>
//             </div>
//           ) : (
//             cart.map((c) => (
//               <div key={c.product.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
//                 <div className="flex-1 min-w-0">
//                   <p className="text-sm font-medium text-slate-900 truncate">{c.product.name}</p>
//                   <p className="text-xs text-slate-400">${Number(c.product.price).toFixed(2)} x {c.quantity}</p>
//                 </div>
//                 <div className="flex items-center gap-1.5">
//                   <button onClick={() => updateQuantity(c.product.id, -1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
//                     <Minus className="w-3 h-3" />
//                   </button>
//                   <span className="w-8 text-center text-sm font-semibold text-slate-900">{c.quantity}</span>
//                   <button onClick={() => updateQuantity(c.product.id, 1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
//                     <Plus className="w-3 h-3" />
//                   </button>
//                   <button onClick={() => removeFromCart(c.product.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors ml-1">
//                     <Trash2 className="w-3 h-3" />
//                   </button>
//                 </div>
//                 <p className="text-sm font-semibold text-slate-900 w-16 text-right">
//                   ${(Number(c.product.price) * c.quantity).toFixed(2)}
//                 </p>
//               </div>
//             ))
//           )}
//         </div>

//         {lastSale && (
//           <div className="mx-4 mb-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
//             <Receipt className="w-4 h-4 text-emerald-600" />
//             <span className="text-sm text-emerald-700 font-medium">Sale completed: ${lastSale.total.toFixed(2)}</span>
//           </div>
//         )}

//         <div className="p-4 border-t border-slate-100">
//           <div className="flex items-center justify-between mb-4">
//             <span className="text-sm font-medium text-slate-500">Total</span>
//             <span className="text-2xl font-bold text-slate-900">${cartTotal.toFixed(2)}</span>
//           </div>
//           <button
//             onClick={handleCheckout}
//             disabled={cart.length === 0 || checkingOut}
//             className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/20"
//           >
//             {checkingOut ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Checkout ($${cartTotal.toFixed(2)})`}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }







import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Search,
  Receipt,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  branch_stock: {
    stock: number;
    branch_id?: string;
  }[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Branch {
  id: string;
  branch_name: string;
}

export default function POSInterface() {
  const { profile } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [crossBranch, setCrossBranch] = useState(false);

  const [sourceBranchId, setSourceBranchId] = useState('');

  const [lastSale, setLastSale] = useState<{
    id: string;
    total: number;
  } | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      loadProducts();
    }
  }, [profile, sourceBranchId, crossBranch]);

  const activeBranchId =
    crossBranch && sourceBranchId
      ? sourceBranchId
      : profile?.id;

  const loadBranches = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, branch_name')
      .eq('role', 'branch');

    setBranches(data || []);
  };

  const loadProducts = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('products')
      .select(`
        *,
        branch_stock(
          stock,
          branch_id
        )
      `)
      .eq('branch_stock.branch_id', activeBranchId)
      .order('name');

    setProducts(data || []);
    setLoading(false);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(
      (c) => c.product.id === product.id
    );

    if (existing) {
      setCart(
        cart.map((c) =>
          c.product.id === product.id
            ? {
                ...c,
                quantity: c.quantity + 1,
              }
            : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
        },
      ]);
    }

    setLastSale(null);
  };

  const updateQuantity = (
    productId: string,
    delta: number
  ) => {
    setCart(
      cart
        .map((c) => {
          if (c.product.id !== productId) return c;

          const newQty = c.quantity + delta;

          return newQty > 0
            ? {
                ...c,
                quantity: newQty,
              }
            : c;
        })
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(
      cart.filter((c) => c.product.id !== productId)
    );
  };

  const cartTotal = cart.reduce(
    (sum, c) =>
      sum + Number(c.product.price) * c.quantity,
    0
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setCheckingOut(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-sale`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sale_type: crossBranch
              ? 'cross_branch'
              : 'normal',

            source_branch_id: activeBranchId,

            items: cart.map((c) => ({
              product_id: c.product.id,
              quantity: c.quantity,
            })),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setLastSale({
        id: data.sale_id,
        total: data.total,
      });

      setCart([]);

      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const filtered = products.filter((p) =>
    p.name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-900">
            Point of Sale
          </h1>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={crossBranch}
                onChange={(e) =>
                  setCrossBranch(e.target.checked)
                }
              />
              Cross-Branch Sale
            </label>

            {crossBranch && (
              <select
                value={sourceBranchId}
                onChange={(e) =>
                  setSourceBranchId(e.target.value)
                }
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">
                  Select Source Branch
                </option>

                {branches
                  .filter((b) => b.id !== profile?.id)
                  .map((branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                    >
                      {branch.branch_name}
                    </option>
                  ))}
              </select>
            )}
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl"
            placeholder="Search products..."
          />
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-3 content-start">
          {filtered.map((p) => {
            const stock =
              p.branch_stock?.[0]?.stock ?? 0;

            const inCart = cart.find(
              (c) => c.product.id === p.id
            );

            return (
              <button
                key={p.id}
                onClick={() =>
                  stock > 0 && addToCart(p)
                }
                disabled={stock <= 0}
                className="bg-white rounded-xl border p-4 text-left"
              >
                {inCart && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {inCart.quantity}
                  </span>
                )}

                <p className="text-sm font-semibold">
                  {p.name}
                </p>

                <p className="text-lg font-bold text-blue-600">
                  $
                  {Number(p.price).toFixed(2)}
                </p>

                <p className="text-xs text-slate-400">
                  {stock} {p.unit} left
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-96 bg-white rounded-xl border flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">
            Cart
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((c) => (
            <div
              key={c.product.id}
              className="flex items-center gap-3 bg-slate-50 rounded-lg p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {c.product.name}
                </p>

                <p className="text-xs text-slate-400">
                  ${Number(c.product.price).toFixed(2)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateQuantity(
                      c.product.id,
                      -1
                    )
                  }
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span>{c.quantity}</span>

                <button
                  onClick={() =>
                    updateQuantity(
                      c.product.id,
                      1
                    )
                  }
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button
                  onClick={() =>
                    removeFromCart(
                      c.product.id
                    )
                  }
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <div className="flex justify-between mb-4">
            <span>Total</span>

            <span className="font-bold text-xl">
              ${cartTotal.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checkingOut}
            className="w-full py-3 bg-blue-600 text-white rounded-xl"
          >
            {checkingOut ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Checkout'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

