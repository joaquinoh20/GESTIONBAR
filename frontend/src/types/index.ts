export type Role = "admin" | "gerente" | "vendedor" | "analista" | "almacen";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface Customer {
  id: number;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  active: boolean;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category_id: number;
  category: string;
  price: number;
  stock: number;
  min_stock: number;
  active: boolean;
}

export interface SaleDetail {
  product_id: number;
  product: string;
  sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  id: number;
  customer_id: number;
  customer: string;
  seller_id: number;
  seller: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: string | null;
  items_count: number;
  created_at: string;
  details?: SaleDetail[];
}

export interface DashboardSummary {
  days: number;
  kpis: {
    revenue: number;
    sales_count: number;
    average_ticket: number;
    median_ticket: number;
    customers: number;
    low_stock: number;
  };
  sales_by_day: { date: string; revenue: number }[];
  top_products: { name: string; quantity: number; revenue: number; share: number }[];
  by_category: { name: string; revenue: number }[];
  by_seller: { name: string; sales: number; revenue: number; average: number }[];
}

export interface FrequencyRow {
  label: string;
  from: number;
  to: number;
  count: number;
  relative: number;
}

export interface Comparison {
  n: number;
  mean: number;
  median: number;
  difference: number;
  difference_pct: number;
  shape: string;
  reading: string;
}

export interface RandomVariable {
  n: number;
  classification: { type: string; scale: string; distinct_values: number; min: number; max: number };
  expected_value: number;
  variance: number;
  std_dev: number;
  min: number;
  max: number;
  distribution: FrequencyRow[];
  probability_above?: { threshold: number; favorable: number; total: number; probability: number };
}

export interface DatasetAnalysis {
  dataset: string;
  description: string;
  variable: RandomVariable["classification"];
  comparison: Comparison;
  random_variable: RandomVariable;
  analysis_id?: number;
}

export interface BayesResult {
  prior: number;
  likelihood: number;
  evidence: number;
  posterior: number;
  posterior_pct: number;
  steps: string[];
  analysis_id: number;
}

export interface SimpleProbResult {
  favorable: number;
  total: number;
  probability: number;
  percentage: number;
  complement: number;
}

export interface Analysis {
  id: number;
  kind: string;
  title: string;
  input_data: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
}

export interface Insight {
  id: number;
  rule: string;
  severity: "info" | "atencion" | "alerta";
  title: string;
  message: string;
  evidence: Record<string, unknown>;
  created_at: string;
}

export interface Report {
  kind: string;
  title: string;
  days: number;
  generated_at: string;
  columns: string[];
  rows: (string | number)[][];
  summary: Record<string, string | number>;
}

export interface AuditEntry {
  id: number;
  user: string | null;
  action: string;
  entity: string;
  entity_id: number | null;
  detail: string | null;
  created_at: string;
}
