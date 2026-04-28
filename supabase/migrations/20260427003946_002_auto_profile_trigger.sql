/*
  # Auto-create profile on signup and seed admin account

  1. New Functions
    - `handle_new_user()` - Trigger function that auto-creates a profile row
      when a new user signs up. Reads role/branch_name/location from user metadata.

  2. New Triggers
    - `on_auth_user_created` - After INSERT on auth.users, calls handle_new_user()

  3. Important Notes
    - When admin creates a branch user via supabase.auth.signUp, the metadata
      (role, branch_name, location, username) must be passed in the user_metadata
      so the trigger can populate the profiles table correctly.
*/

-- Trigger function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, username, role, branch_name, location)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'branch'),
    NEW.raw_user_meta_data->>'branch_name',
    NEW.raw_user_meta_data->>'location'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
