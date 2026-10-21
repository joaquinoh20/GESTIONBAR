import { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Spinner } from "../components/ui";
import Layout from "../layouts/Layout";
import Analytics from "../modules/analytics/Analytics";
import Audit from "../modules/audit/Audit";
import Login from "../modules/auth/Login";
import Customers from "../modules/customers/Customers";
import Dashboard from "../modules/dashboard/Dashboard";
import Movements from "../modules/inventory/Movements";
import Restock from "../modules/inventory/Restock";
import Insights from "../modules/insights/Insights";
import Probability from "../modules/probability/Probability";
import Products from "../modules/products/Products";
import Performance from "../modules/sales/Performance";
import Reports from "../modules/reports/Reports";
import Sales from "../modules/sales/Sales";
import SectionHub from "../modules/sections/SectionHub";
import Settings from "../modules/settings/Settings";
import type { Role } from "../types";
import { useAuth } from "./auth";

function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { can } = useAuth();
  return can(...roles) ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="seccion/:id" element={<SectionHub />} />
        <Route path="configuracion" element={<Navigate to="/configuracion/apariencia" replace />} />
        <Route path="configuracion/:tab" element={<Settings />} />
        <Route path="ventas" element={<Guard roles={["gerente", "vendedor"]}><Sales /></Guard>} />
        <Route path="rendimiento" element={<Guard roles={["gerente", "analista", "vendedor"]}><Performance /></Guard>} />
        <Route path="reposicion" element={<Guard roles={["gerente", "almacen"]}><Restock /></Guard>} />
        <Route path="movimientos" element={<Guard roles={["gerente", "almacen", "analista"]}><Movements /></Guard>} />
        <Route path="clientes" element={<Customers />} />
        <Route path="productos" element={<Products />} />
        <Route path="analytics" element={<Guard roles={["gerente", "analista"]}><Analytics /></Guard>} />
        <Route path="probabilidad" element={<Guard roles={["gerente", "analista"]}><Probability /></Guard>} />
        <Route path="insights" element={<Insights />} />
        <Route path="reportes" element={<Guard roles={["gerente", "analista"]}><Reports /></Guard>} />
        <Route path="auditoria" element={<Guard roles={["gerente"]}><Audit /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
