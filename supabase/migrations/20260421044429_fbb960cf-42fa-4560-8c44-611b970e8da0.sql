-- Make the locked-down intent explicit to satisfy the linter.
CREATE POLICY "Deny all rate_limit" ON public.rate_limit
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);