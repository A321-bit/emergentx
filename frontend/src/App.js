import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "./components/ui/sonner";

// Layout
import MainLayout from "./components/layout/MainLayout";

// Pages
import Login from "./pages/Login";
import EmergencyReset from "./pages/EmergencyReset";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Roles from "./pages/Roles";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Stock from "./pages/Stock";
import Customers from "./pages/Customers";
import CustomerSettings from "./pages/CustomerSettings";
import Quotes from "./pages/Quotes";
import Callbacks from "./pages/Callbacks";
import Dealers from "./pages/Dealers";
import DealerGroups from "./pages/DealerGroups";
import Sales from "./pages/Sales";
import Accounting from "./pages/Accounting";
import Finance from "./pages/Finance";
import Reports from "./pages/Reports";
import Packages from "./pages/Packages";
import PackageCategories from "./pages/PackageCategories";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Payroll from "./pages/Payroll";
import Settings from "./pages/Settings";
import QuoteTemplates from "./pages/QuoteTemplates";
import XMLSettings from "./pages/XMLSettings";
import Banks from "./pages/Banks";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/products" element={<Products />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customer-settings" element={<CustomerSettings />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/quotes/callbacks" element={<Callbacks />} />
              <Route path="/dealer-groups" element={<DealerGroups />} />
              <Route path="/dealers" element={<Dealers />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/banks" element={<Banks />} />
              <Route path="/accounting" element={<Accounting />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/package-categories" element={<PackageCategories />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/quote-templates" element={<QuoteTemplates />} />
              <Route path="/settings/xml" element={<XMLSettings />} />
            </Route>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
