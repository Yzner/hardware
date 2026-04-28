/*
  # POS System - Core Schema

  1. New Tables
    - `profiles` - Extends auth.users with role, branch info
      - `id` (uuid, PK, references auth.users)
      - `username` (text, unique)
      - `role` (text: 'admin' or 'branch')
      - `branch_name` (text, nullable - only for branch users)
      - `location` (text, nullable - only for branch users)
      - `created_at` (timestamptz)

    - `products` - Global inventory managed by admin
      - `id` (uuid, PK)
      - `name` (text)
      - `price` (numeric)
      - `stock` (integer - global stock)
      - `unit` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `branch_stock` - Per-branch stock levels
      - `id` (uuid, PK)
      - `product_id` (uuid, FK to products)
      - `branch_id` (uuid, FK to profiles)
      - `stock` (integer)
      - `updated_at` (timestamptz)
      - Unique constraint on (product_id, branch_id)

    - `stock_requests` - Branch requests for stock additions
      - `id` (uuid, PK)
      - `branch_id` (uuid, FK to profiles)
      - `product_id` (uuid, FK to products)
      - `quantity` (integer)
      - `status` (text: 'pending', 'approved', 'rejected')
      - `created_at` (timestamptz)
      - `resolved_at` (timestamptz, nullable)

    - `sales` - Sales transactions from branches
      - `id` (uuid, PK)
      - `branch_id` (uuid, FK to profiles)
      - `total` (numeric)
      - `created_at` (timestamptz)

    - `sale_items` - Individual items in a sale
      - `id` (uuid, PK)
      - `sale_id` (uuid, FK to sales)
      - `product_id` (uuid, FK to products)
      - `quantity` (integer)
      - `unit_price` (numeric)
      - `subtotal` (numeric)

    - `activity_logs` - All actions logged per branch
      - `id` (uuid, PK)
      - `branch_id` (uuid, FK to profiles, nullable for admin actions)
      - `action` (text)
      - `details` (text)
      - `created_at` (timestamptz)

    - `notifications` - Admin-to-branch notifications
      - `id` (uuid, PK)
      - `branch_id` (uuid, FK to profiles, nullable for broadcast)
      - `message` (text)
      - `read` (boolean, default false)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Admin can read/write all tables
    - Branch users can only read/write their own data
    - Branch users can only read products (not modify)
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'branch')),
  branch_name text,
  location text,
  created_at timestamptz DEFAULT now()
);

-- Products table (global inventory)
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Branch stock table
CREATE TABLE IF NOT EXISTS branch_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stock integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, branch_id)
);

-- Stock requests table
CREATE TABLE IF NOT EXISTS stock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) NOT NULL DEFAULT 0
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get current user's branch_id
CREATE OR REPLACE FUNCTION my_branch_id() RETURNS uuid AS $$
  SELECT id FROM profiles WHERE id = auth.uid() AND role = 'branch'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (is_admin() OR id = auth.uid());

CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Products policies
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can insert products"
  ON products FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update products"
  ON products FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete products"
  ON products FOR DELETE TO authenticated
  USING (is_admin());

-- Branch stock policies
CREATE POLICY "Admin can view all branch stock"
  ON branch_stock FOR SELECT TO authenticated
  USING (is_admin() OR branch_id = auth.uid());

CREATE POLICY "Admin can insert branch stock"
  ON branch_stock FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update branch stock"
  ON branch_stock FOR UPDATE TO authenticated
  USING (is_admin() OR branch_id = auth.uid())
  WITH CHECK (is_admin() OR branch_id = auth.uid());

-- Stock requests policies
CREATE POLICY "Admin can view all stock requests"
  ON stock_requests FOR SELECT TO authenticated
  USING (is_admin() OR branch_id = auth.uid());

CREATE POLICY "Branch can create stock requests"
  ON stock_requests FOR INSERT TO authenticated
  WITH CHECK (branch_id = auth.uid());

CREATE POLICY "Admin can update stock requests"
  ON stock_requests FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Sales policies
CREATE POLICY "Admin can view all sales"
  ON sales FOR SELECT TO authenticated
  USING (is_admin() OR branch_id = auth.uid());

CREATE POLICY "Branch can create sales"
  ON sales FOR INSERT TO authenticated
  WITH CHECK (branch_id = auth.uid());

-- Sale items policies
CREATE POLICY "Users can view sale items for their sales"
  ON sale_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND (is_admin() OR sales.branch_id = auth.uid()))
  );

CREATE POLICY "Branch can create sale items"
  ON sale_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.branch_id = auth.uid())
  );

-- Activity logs policies
CREATE POLICY "Admin can view all activity logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (is_admin() OR branch_id = auth.uid());

CREATE POLICY "Authenticated can insert activity logs"
  ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Admin can view all notifications"
  ON notifications FOR SELECT TO authenticated
  USING (is_admin() OR branch_id = auth.uid() OR branch_id IS NULL);

CREATE POLICY "Admin can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Branch can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (branch_id = auth.uid())
  WITH CHECK (branch_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_branch_stock_product ON branch_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_branch_stock_branch ON branch_stock(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_branch ON stock_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_status ON stock_requests(status);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_branch ON activity_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_branch ON notifications(branch_id);
