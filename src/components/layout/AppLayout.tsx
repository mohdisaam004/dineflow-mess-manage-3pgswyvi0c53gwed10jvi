import React from "react";
type AppLayoutProps = {
  children: React.ReactNode;
};
export function AppLayout({ children }: AppLayoutProps): JSX.Element {
  // This component is intentionally left blank as the layout is now handled
  // directly within the DashboardPage component.
  return <>{children}</>;
}