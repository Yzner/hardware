import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Send,
  Loader2,
  ArrowRightLeft,
  Package,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  unit: string;
}

interface Branch {
  id: string;
  branch_name: string;
}

interface BranchStock {
  id: string;
  branch_id: string;
  product_id: string;
  stock: number;
  products: Product;
}

export default function SendItem() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [stocks, setStocks] = useState<BranchStock[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [targetBranch, setTargetBranch] = useState('');
  const [sendType, setSendType] = useState<'branch' | 'admin'>(
    'branch'
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // current profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile(profileData);

    // branch stocks
    const { data: stockData, error } = await supabase
      .from('branch_stock')
      .select(`
        *,
        products (
          id,
          name,
          unit
        )
      `)
      .eq('branch_id', user.id)
      .gt('stock', 0);

    if (!error && stockData) {
      setStocks(stockData as any);
    }

    // other branches
    const { data: branchData } = await supabase
      .from('profiles')
      .select('id, branch_name')
      .eq('role', 'branch')
      .neq('id', user.id);

    if (branchData) {
      setBranches(branchData as any);
    }
  };

  const handleSend = async () => {
    try {
      setLoading(true);

      if (!selectedProduct) {
        alert('Please select product');
        return;
      }

      if (quantity <= 0) {
        alert('Invalid quantity');
        return;
      }

      if (sendType === 'branch' && !targetBranch) {
        alert('Select target branch');
        return;
      }

      const senderStock = stocks.find(
        (s) => s.product_id === selectedProduct
      );

      if (!senderStock) {
        alert('Stock not found');
        return;
      }

      if (quantity > senderStock.stock) {
        alert('Insufficient stock');
        return;
      }

      // =========================
      // DEDUCT FROM SENDER
      // =========================

      const newSenderStock = senderStock.stock - quantity;

      const { error: deductError } = await supabase
        .from('branch_stock')
        .update({
          stock: newSenderStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', senderStock.id);

      if (deductError) {
        console.error(deductError);
        alert('Failed deducting stock');
        return;
      }

      // =========================
      // SEND TO OTHER BRANCH
      // =========================

      if (sendType === 'branch') {
        // IMPORTANT FIX:
        // remove .single()
        const { data: existingStock, error: existingError } =
          await supabase
            .from('branch_stock')
            .select('*')
            .eq('branch_id', targetBranch)
            .eq('product_id', selectedProduct);

        if (existingError) {
          console.error(existingError);
          alert('Failed checking branch stock');
          return;
        }

        // if stock already exists
        if (existingStock && existingStock.length > 0) {
          const targetStock = existingStock[0];

          const { error: updateError } = await supabase
            .from('branch_stock')
            .update({
              stock: targetStock.stock + quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetStock.id);

          if (updateError) {
            console.error(updateError);
            alert('Failed updating target stock');
            return;
          }
        }

        // if stock does not exist yet
        else {
          const { error: insertError } = await supabase
            .from('branch_stock')
            .insert({
              branch_id: targetBranch,
              product_id: selectedProduct,
              stock: quantity,
            });

          if (insertError) {
            console.error(insertError);
            alert('Failed inserting target stock');
            return;
          }
        }

        // notification
        await supabase.from('notifications').insert({
          branch_id: targetBranch,
          message: `${profile.branch_name} sent ${quantity} ${senderStock.products.unit} of ${senderStock.products.name}`,
        });

        // logs
        await supabase.from('activity_logs').insert({
          branch_id: profile.id,
          action: 'SEND ITEM',
          details: `Sent ${quantity} ${senderStock.products.unit} of ${senderStock.products.name} to another branch`,
        });

        alert('Item sent successfully');
      }

      // =========================
      // RETURN TO ADMIN STOCK
      // =========================

      else {
        const { data: productData, error: productError } =
          await supabase
            .from('products')
            .select('stock')
            .eq('id', selectedProduct)
            .single();

        if (productError || !productData) {
          alert('Product not found');
          return;
        }

        const { error: updateProductError } = await supabase
          .from('products')
          .update({
            stock: productData.stock + quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedProduct);

        if (updateProductError) {
          console.error(updateProductError);
          alert('Failed returning stock');
          return;
        }

        await supabase.from('activity_logs').insert({
          branch_id: profile.id,
          action: 'RETURN STOCK',
          details: `Returned ${quantity} ${senderStock.products.unit} of ${senderStock.products.name} to admin warehouse`,
        });

        alert('Stock returned to admin');
      }

      // reset
      setSelectedProduct('');
      setQuantity(1);
      setTargetBranch('');

      fetchData();
    } catch (error) {
      console.error(error);
      alert('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-100 p-3 rounded-xl">
          <ArrowRightLeft className="w-6 h-6 text-emerald-600" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Send Items
          </h2>

          <p className="text-sm text-slate-500">
            Transfer stock to another branch or admin
            warehouse
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* send type */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Send To
          </label>

          <select
            value={sendType}
            onChange={(e) =>
              setSendType(e.target.value as 'branch' | 'admin')
            }
            className="w-full border border-slate-300 rounded-xl px-4 py-3"
          >
            <option value="branch">
              Another Branch
            </option>

            <option value="admin">
              Admin Warehouse
            </option>
          </select>
        </div>

        {/* target branch */}
        {sendType === 'branch' && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Target Branch
            </label>

            <select
              value={targetBranch}
              onChange={(e) =>
                setTargetBranch(e.target.value)
              }
              className="w-full border border-slate-300 rounded-xl px-4 py-3"
            >
              <option value="">
                Select Branch
              </option>

              {branches.map((branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.branch_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* product */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Product
          </label>

          <select
            value={selectedProduct}
            onChange={(e) =>
              setSelectedProduct(e.target.value)
            }
            className="w-full border border-slate-300 rounded-xl px-4 py-3"
          >
            <option value="">
              Select Product
            </option>

            {stocks.map((item) => (
              <option
                key={item.id}
                value={item.product_id}
              >
                {item.products.name} ({item.stock}{' '}
                {item.products.unit})
              </option>
            ))}
          </select>
        </div>

        {/* quantity */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Quantity
          </label>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) =>
              setQuantity(Number(e.target.value))
            }
            className="w-full border border-slate-300 rounded-xl px-4 py-3"
          />
        </div>

        {/* button */}
        <button
          onClick={handleSend}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Item
            </>
          )}
        </button>
      </div>

      {/* stocks */}
      <div className="mt-8">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Current Stocks
        </h3>

        <div className="space-y-3">
          {stocks.map((item) => (
            <div
              key={item.id}
              className="border border-slate-200 rounded-xl p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-slate-800">
                  {item.products.name}
                </p>

                <p className="text-sm text-slate-500">
                  {item.stock} {item.products.unit}
                </p>
              </div>

              <Package className="w-5 h-5 text-slate-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}