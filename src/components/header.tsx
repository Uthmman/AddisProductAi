import Link from "next/link";
import { Package, FolderTree, Settings, FileText } from "lucide-react";
import { Button } from "./ui/button";
import NavLink from "./nav-link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/dashboard" className="mr-4 flex items-center space-x-2">
          <Package className="h-6 w-6 text-primary" />
          <span className="font-bold font-headline text-lg sm:inline-block">
            Addis Product AI
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-between space-x-2 md:space-x-4">
           <nav className="flex items-center space-x-1 sm:space-x-2 text-sm font-medium">
            <NavLink href="/dashboard">
              <Package className="h-4 w-4 mr-2" />
              Products
            </NavLink>
             <NavLink href="/categories">
                <FolderTree className="h-4 w-4 mr-2" />
                Categories
             </NavLink>
             <NavLink href="/content">
                <FileText className="h-4 w-4 mr-2" />
                Content
             </NavLink>
             <NavLink href="/settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
             </NavLink>
          </nav>
          <div className="flex items-center justify-end space-x-2">
            {/* Future nav items can go here */}
          </div>
        </div>
      </div>
    </header>
  );
}
