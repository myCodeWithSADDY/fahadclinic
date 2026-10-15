GRANT DELETE ON TABLE public.appointments TO authenticated;

CREATE POLICY "Doctors and receptionists can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  public.has_role('DOCTOR', auth.uid())
  OR public.has_role('RECEPTIONIST', auth.uid())
);
