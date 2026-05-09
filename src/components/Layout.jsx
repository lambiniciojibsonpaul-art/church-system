import { Outlet } from "react-router-dom";
import Header from "./Header";

// Single-Header layout. Rendered once at the route tree root so navigating
// between pages does not unmount/remount the header (eliminating the
// LOGIN/LOGOUT button flicker).
function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

export default Layout;
