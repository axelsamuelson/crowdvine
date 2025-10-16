-- Fix pallet that is incorrectly marked as complete
-- This pallet has only 6 bottles but is marked as complete

-- First, let's see the current state
SELECT 
  id,
  name,
  bottle_capacity,
  current_bottles,
  is_complete,
  status,
  completed_at
FROM pallets 
WHERE id = '3985cbfe-178f-4fa1-a897-17183a1f18db';

-- Fix the incorrect completion status
UPDATE pallets 
SET 
  is_complete = false,
  status = 'OPEN',
  completed_at = NULL,
  payment_deadline = NULL
WHERE id = '3985cbfe-178f-4fa1-a897-17183a1f18db';

-- Also fix any reservations that might have incorrect payment status
UPDATE order_reservations 
SET 
  status = 'placed',
  payment_status = NULL,
  payment_deadline = NULL
WHERE pallet_id = '3985cbfe-178f-4fa1-a897-17183a1f18db'
AND (payment_status = 'pending' OR status = 'pending_payment');

-- Verify the fix
SELECT 
  id,
  name,
  bottle_capacity,
  current_bottles,
  is_complete,
  status,
  completed_at
FROM pallets 
WHERE id = '3985cbfe-178f-4fa1-a897-17183a1f18db';
