-- ============================================================
-- Auth Migration: Production-ready password management
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add must_change_password flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Set all users with default password to require change
UPDATE users SET must_change_password = true;

-- 2. Create user function (for admin to create new team members)
CREATE OR REPLACE FUNCTION create_user(
  p_id TEXT,
  p_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_department TEXT,
  p_role TEXT DEFAULT 'member',
  p_whatsapp_number TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing users%ROWTYPE;
BEGIN
  -- Check for duplicate email
  SELECT * INTO v_existing FROM users WHERE email = p_email;
  IF FOUND THEN
    RETURN json_build_object('error', 'A user with this email already exists');
  END IF;

  INSERT INTO users (id, name, email, password_hash, department, role, whatsapp_number, must_change_password)
  VALUES (
    p_id,
    p_name,
    p_email,
    crypt(p_password, gen_salt('bf')),
    p_department,
    p_role,
    p_whatsapp_number,
    true  -- new users must change password on first login
  );

  RETURN json_build_object(
    'id', p_id,
    'name', p_name,
    'email', p_email,
    'department', p_department,
    'role', p_role
  );
END;
$$;

-- 3. Change password function (for users to change their own password)
CREATE OR REPLACE FUNCTION change_password(
  p_user_id TEXT,
  p_current_password TEXT,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  -- Verify current password
  IF v_user.password_hash != crypt(p_current_password, v_user.password_hash) THEN
    RETURN json_build_object('error', 'Current password is incorrect');
  END IF;

  -- Enforce minimum length
  IF length(p_new_password) < 6 THEN
    RETURN json_build_object('error', 'New password must be at least 6 characters');
  END IF;

  -- Update password and clear must_change flag
  UPDATE users
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      must_change_password = false
  WHERE id = p_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 4. Admin reset password function (admin can set a new temp password for any user)
CREATE OR REPLACE FUNCTION admin_reset_password(
  p_admin_id TEXT,
  p_target_user_id TEXT,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin users%ROWTYPE;
BEGIN
  -- Verify caller is admin
  SELECT * INTO v_admin FROM users WHERE id = p_admin_id AND role = 'admin' AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Unauthorized: admin access required');
  END IF;

  -- Update target user's password and force change on next login
  UPDATE users
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      must_change_password = true
  WHERE id = p_target_user_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Target user not found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- 5. Update authenticate to return must_change_password flag
CREATE OR REPLACE FUNCTION authenticate(p_email TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users WHERE email = p_email AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid email or password');
  END IF;
  IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    RETURN json_build_object(
      'id', v_user.id,
      'name', v_user.name,
      'email', v_user.email,
      'department', v_user.department,
      'role', v_user.role,
      'is_active', v_user.is_active,
      'whatsapp_number', v_user.whatsapp_number,
      'must_change_password', v_user.must_change_password
    );
  ELSE
    RETURN json_build_object('error', 'Invalid email or password');
  END IF;
END;
$$;
