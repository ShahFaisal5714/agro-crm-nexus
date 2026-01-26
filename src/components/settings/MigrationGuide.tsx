import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Database, Key, Shield, Table, Upload, CheckCircle } from "lucide-react";

export const MigrationGuide = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Migration Guide
        </CardTitle>
        <CardDescription>
          Step-by-step instructions to migrate data to your personal Supabase project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="step-1">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Step 1: Export Your Data
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>1. Go to the <strong>Data Export</strong> tab above</p>
              <p>2. Select all tables you want to migrate</p>
              <p>3. Click <strong>Export Selected Tables</strong></p>
              <p>4. Save the ZIP file to your computer</p>
              <Alert className="mt-3">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  The export contains both CSV and JSON files for each table
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-2">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Table className="h-4 w-4" />
                Step 2: Create Database Schema
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>In your Supabase Dashboard → SQL Editor, run these commands:</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
{`-- 1. Create the app_role enum
CREATE TYPE public.app_role AS ENUM (
  'admin', 
  'territory_sales_manager', 
  'dealer', 
  'finance', 
  'employee'
);

-- 2. Create territories table
CREATE TABLE public.territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

-- 3. Create product_categories table
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT
);

-- 4. Create suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT
);

-- 5. Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES product_categories(id),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'units',
  pack_size TEXT,
  unit_price NUMERIC NOT NULL,
  cost_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create dealers table
CREATE TABLE public.dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  territory_id UUID REFERENCES territories(id),
  dealer_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Continue with remaining tables...
-- See full schema in Supabase migrations folder`}
              </pre>
              <Alert>
                <AlertTitle>Full Schema</AlertTitle>
                <AlertDescription>
                  Copy the complete schema from your project's <code>supabase/migrations</code> folder
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-3">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Step 3: Set Up RLS Policies
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>Enable Row Level Security and create policies:</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
{`-- Enable RLS on all tables
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Create the has_role function
CREATE OR REPLACE FUNCTION public.has_role(
  _user_id UUID, 
  _role app_role
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Example policy for territories
CREATE POLICY "All users can view territories"
  ON public.territories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage territories"
  ON public.territories FOR ALL
  USING (has_role(auth.uid(), 'admin'));`}
              </pre>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-4">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Step 4: Import Data
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p><strong>Option A: Using SQL Editor (Recommended for clean import)</strong></p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Open your Supabase Dashboard → SQL Editor</li>
                <li>For each JSON file in your export, convert to INSERT statements</li>
                <li>Run inserts in this order: territories → categories → suppliers → products → dealers → etc.</li>
              </ol>
              
              <p className="mt-4"><strong>Option B: Using CSV Import</strong></p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to Table Editor in Supabase Dashboard</li>
                <li>Select a table and click "Import data from CSV"</li>
                <li>Upload the corresponding CSV file</li>
                <li>Map columns and import</li>
              </ol>

              <p className="mt-4"><strong>Option C: Using this App's Import Feature</strong></p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Update your app's Supabase connection to point to your personal project</li>
                <li>Use the Data Import section below to upload the ZIP file</li>
                <li>The import will automatically handle the correct order</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-5">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Step 5: Update Your App Connection
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p>To connect this app to your personal Supabase:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Fork/clone the project to a new Lovable project</li>
                <li>In the new project, connect to your personal Supabase</li>
                <li>Update the environment variables:
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li><code>VITE_SUPABASE_URL</code> = your project URL</li>
                    <li><code>VITE_SUPABASE_PUBLISHABLE_KEY</code> = your anon key</li>
                  </ul>
                </li>
              </ol>
              <Alert className="mt-3">
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  The current project is connected to Lovable Cloud and cannot be switched. You'll need to create a new project for your personal Supabase connection.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};
