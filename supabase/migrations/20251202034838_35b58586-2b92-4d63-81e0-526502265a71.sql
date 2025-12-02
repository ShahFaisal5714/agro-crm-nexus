-- Insert sample territories if they don't exist
INSERT INTO public.territories (name, code) 
VALUES 
  ('Punjab', 'PB'),
  ('Sindh', 'SD'),
  ('Khyber Pakhtunkhwa', 'KP'),
  ('Balochistan', 'BL'),
  ('Islamabad Capital Territory', 'ICT')
ON CONFLICT DO NOTHING;

-- Insert sample suppliers
INSERT INTO public.suppliers (name, contact_person, email, phone, address, gst_number)
VALUES
  ('ABC Traders', 'Ahmed Khan', 'ahmed@abctraders.pk', '+92-300-1234567', 'Plot 123, Industrial Area, Karachi', '01-234-5678-901'),
  ('Modern Suppliers Co.', 'Fatima Ali', 'fatima@modernsuppliers.pk', '+92-321-7654321', 'Street 45, F-8 Markaz, Islamabad', '02-345-6789-012'),
  ('Prime Goods Ltd.', 'Hassan Raza', 'hassan@primegoods.pk', '+92-333-9876543', 'Main Boulevard, Lahore', '03-456-7890-123')
ON CONFLICT DO NOTHING;