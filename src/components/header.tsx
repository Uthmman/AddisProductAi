import Link from "next/link";
import { Package, FolderTree, Settings, FileText } from "lucide-react";
import { Button } from "./ui/button";
import NavLink from "./nav-link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-auto min-h-14 flex-col items-start justify-center gap-4 py-2 md:flex-row md:items-center">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Package className="h-6 w-6 text-primary" />
          <span className="font-bold font-headline text-lg">
            Addis Product AI
          </span>
        </Link>
        <div className="flex w-full flex-1 items-center justify-start overflow-x-auto md:justify-start">
           <nav className="flex items-center gap-1 text-sm font-medium">
            <NavLink href="/dashboard">
              <Package className="h-4 w-4 mr-1.5" />
              Products
            </NavLink>
             <NavLink href="/categories">
                <FolderTree className="h-4 w-4 mr-1.5" />
                Categories
             </NavLink>
             <NavLink href="/content">
                <FileText className="h-4 w-4 mr-1.5" />
                Content
             </NavLink>
             <NavLink href="/settings">
                <Settings className="h-4 w-4 mr-1.5" />
                Settings
             </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}
