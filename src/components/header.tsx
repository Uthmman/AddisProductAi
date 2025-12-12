import Link from "next/link";
import { Package, FolderTree, Settings } from "lucide-react";
import { Button } from "./ui/button";

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
           <nav className="flex items-center space-x-2 sm:space-x-4 text-sm font-medium">
            <Link
              href="/dashboard"
              className="transition-colors hover:text-foreground/80 text-foreground text-xs sm:text-sm"
            >
              Products
            </Link>
             <Link
              href="/categories"
              className="transition-colors hover:text-foreground/80 text-foreground/60 text-xs sm:text-sm"
            >
              Categories
            </Link>
             <Link
              href="/settings"
              className="transition-colors hover:text-foreground/80 text-foreground/60 text-xs sm:text-sm"
            >
              Settings
            </Link>
          </nav>
          <div className="flex items-center justify-end space-x-2">
            {/* Future nav items can go here */}
          </div>
        </div>
      </div>
    </header>
  );
}
