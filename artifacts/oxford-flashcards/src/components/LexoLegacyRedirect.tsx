import { useEffect } from "react";
import { useLocation, useParams } from "wouter";

export function LexoLegacyHubRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/dashboard/english", { replace: true });
  }, [navigate]);
  return null;
}

export function LexoLegacyToolRedirect() {
  const params = useParams<{ tool: string }>();
  const [, navigate] = useLocation();
  useEffect(() => {
    const tool = params.tool ?? "";
    navigate(`/dashboard/english/${tool}`, { replace: true });
  }, [navigate, params.tool]);
  return null;
}
