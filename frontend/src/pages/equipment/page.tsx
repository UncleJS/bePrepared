import { Navigate } from "react-router-dom";

export default function EquipmentRedirectPage() {
  return <Navigate to="/supplies?tab=equipment" replace />;
}
