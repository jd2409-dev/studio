'use client'; // Ensure this is at the top

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import { PanelLeft, Search } from "lucide-react"; // Added Search

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button"; // Import buttonVariants
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"; // Added SheetTitle
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem"; // Approx 256px
const SIDEBAR_WIDTH_MOBILE = "18rem"; // Slightly wider for mobile
const SIDEBAR_WIDTH_ICON = "3.5rem"; // Approx 56px for icon + padding
// const SIDEBAR_KEYBOARD_SHORTCUT = "b"; // Commented out as toggle is removed

type SidebarContext = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  // toggleSidebar: () => void; // Commented out as toggle is removed
};

const SidebarContext = React.createContext<SidebarContext | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

// Helper function to safely get cookie value
const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined; // Ensure document is available
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
};


const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(
  (
    {
      defaultOpen = true, // Default state if no cookie or prop
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);

    // Initialize state from cookie or defaultOpen
    const getInitialOpenState = (): boolean => {
      if (typeof window === 'undefined') return defaultOpen; // Default server-side
       if (isMobile) return false; // Always start closed on mobile initially
       const cookieValue = getCookie(SIDEBAR_COOKIE_NAME);
       // If toggle is removed, default to open on desktop unless explicitly controlled
       // return cookieValue === undefined ? defaultOpen : cookieValue === 'true';
       return defaultOpen; // Default to open since toggle is removed
    };

    const [_open, _setOpen] = React.useState(getInitialOpenState());

    // Controlled vs Uncontrolled state
    const open = openProp ?? _open;
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }

        // Set cookie only for non-mobile state changes (keep this if you might re-add toggle)
        // if (!isMobile && typeof document !== 'undefined') {
        //    document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`; // Add SameSite
        // }
      },
      [setOpenProp, open] // Removed isMobile dependency as cookie logic is commented out
    );

     // Update internal state if controlled prop changes
     React.useEffect(() => {
        if (openProp !== undefined && openProp !== _open) {
           _setOpen(openProp);
        }
     }, [openProp, _open]);

    // Update initial state once isMobile is determined client-side
    React.useEffect(() => {
        if (isMobile !== undefined) { // Ensure isMobile has been determined
             _setOpen(getInitialOpenState());
        }
    }, [isMobile]); // Run when isMobile value changes


    // // Helper to toggle the sidebar - Commented out as toggle is removed
    // const toggleSidebar = React.useCallback(() => {
    //   return isMobile
    //     ? setOpenMobile((current) => !current)
    //     : setOpen((current) => !current);
    // }, [isMobile, setOpen, setOpenMobile]);

    // // Keyboard shortcut - Commented out as toggle is removed
    // React.useEffect(() => {
    //   const handleKeyDown = (event: KeyboardEvent) => {
    //     if (
    //       event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
    //       (event.metaKey || event.ctrlKey) &&
    //       !event.defaultPrevented // Ignore if already handled (e.g., in input)
    //     ) {
    //       event.preventDefault();
    //       toggleSidebar();
    //     }
    //   };

    //   window.addEventListener("keydown", handleKeyDown);
    //   return () => window.removeEventListener("keydown", handleKeyDown);
    // }, [toggleSidebar]);

    // State is always 'expanded' on desktop now, mobile state depends on openMobile
    const state = isMobile ? (openMobile ? "expanded" : "collapsed") : "expanded";

    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        state,
        open, // Desktop open state (effectively always true now unless controlled)
        setOpen,
        isMobile,
        openMobile, // Mobile sheet open state
        setOpenMobile,
        // toggleSidebar, // Commented out
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile] // Removed toggleSidebar
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={150}> {/* Slight delay */}
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON, // Keep for potential future use if icon-only mode is needed without toggle
                "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE, // Add mobile width variable
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none"; // Keep prop definition, but logic changes
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "none", // Default to "none" since toggle is removed
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    // If collapsible is explicitly "none", always render the fixed sidebar
    if (collapsible === "none") {
      return (
        <div
          className={cn(
            "hidden md:flex h-full w-[--sidebar-width] flex-col border-border bg-sidebar text-sidebar-foreground flex-shrink-0", // Added flex-shrink-0
             side === "left" ? "border-r" : "border-l", // Add border based on side
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      );
    }


    if (isMobile) {
      // Mobile Sheet behavior remains, but opening it requires a different mechanism now
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            className="w-[--sidebar-width-mobile] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden" // Use mobile width variable
            side={side}
          >
             <SheetTitle className="sr-only">Sidebar Navigation</SheetTitle>
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      );
    }

    // Desktop Sidebar Logic (Simplified as it's likely always expanded now)
    return (
      <div
        ref={ref}
        className={cn("group peer hidden md:flex flex-col text-sidebar-foreground")} // Ensure text color is set, added flex-col
        data-state={state} // state will be 'expanded' on desktop
        data-collapsible={collapsible} // Keep prop for potential styling
        data-variant={variant}
        data-side={side}
      >
        {/* This div creates the space for the sidebar */}
        <div
          className={cn(
            "duration-200 relative h-svh bg-transparent transition-[width] ease-in-out flex-shrink-0", // Prevent shrinking
             // Always use full width since toggle is removed
             "w-[--sidebar-width]",
          )}
        />
         {/* This is the actual fixed sidebar */}
        <div
          className={cn(
            "duration-200 fixed inset-y-0 z-10 hidden h-svh transition-[left,right,width] ease-in-out md:flex",
            // Base width
            "w-[--sidebar-width]",
            // Positioning based on side
            side === "left" ? "left-0" : "right-0",
             // Border for non-floating/inset variants
             variant !== 'floating' && variant !== 'inset' && (side === 'left' ? 'border-r border-sidebar-border' : 'border-l border-sidebar-border'),
            className
          )}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className={cn(
                "flex h-full w-full flex-col bg-sidebar",
                 // Apply styles for floating/inset variants
                 variant === "floating" && "rounded-lg border border-sidebar-border shadow-md m-2", // Added margin
                 variant === "inset" && "" // Inset likely controlled by SidebarInset component
            )}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
)
Sidebar.displayName = "Sidebar"

// Removed SidebarTrigger component definition

// Removed SidebarRail component definition (toggle related)

const SidebarInset = React.forwardRef<
  HTMLDivElement, // Changed from main for flexibility
  React.HTMLAttributes<HTMLDivElement> // Use HTMLAttributes
>(({ className, ...props }, ref) => {
  // Adjusted margins to assume sidebar is always present and expanded on desktop
  return (
    <div // Use div instead of main
      ref={ref}
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background transition-[margin-left,margin-right] duration-200 ease-in-out", // Added transition
        // Adjust margin based on sidebar presence and variant (only for non-mobile)
        "md:peer-data-[side=left]:peer-data-[variant=sidebar]:ml-[var(--sidebar-width)]",
        "md:peer-data-[side=right]:peer-data-[variant=sidebar]:mr-[var(--sidebar-width)]",
        // Inset variant styling (applied when sidebar is present)
         "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:rounded-lg md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-border md:peer-data-[variant=inset]:shadow-sm",
        className
      )}
      {...props}
    />
  );
})
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <div className="relative px-2 pb-2"> {/* Removed collapse specific styles */}
        <Input
          ref={ref}
          data-sidebar="input"
          className={cn(
            "h-9 w-full bg-sidebar-accent border-sidebar-border shadow-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground", // Removed collapse specific styles
            className
          )}
          {...props}
        />
         {/* Optional: Add a search icon - Kept for styling consistency */}
         {/* <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-data-[state=collapsed]:group-data-[collapsible=icon]:inline-flex h-8 w-8" aria-label="Search">
              <Search className="h-4 w-4" />
         </Button> */}
    </div>
  );
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> // Use HTMLAttributes
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2 border-b border-sidebar-border flex-shrink-0", className)} // Removed collapse specific styles
      {...props}
    />
  );
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> // Use HTMLAttributes
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2 mt-auto border-t border-sidebar-border flex-shrink-0", className)} // Add flex-shrink-0 and mt-auto
      {...props}
    />
  );
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 my-1 w-auto bg-sidebar-border", className)} // Removed collapse specific styles
      {...props}
    />
  );
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> // Use HTMLAttributes
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-1", // Add padding
        // "group-data-[collapsible=icon]:group-data-[state=collapsed]:overflow-visible", // Removed tooltip related style
        className
      )}
      {...props}
    />
  );
})
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> // Use HTMLAttributes
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col px-1 py-2", className)} // Adjusted padding
      {...props}
    />
  );
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-[margin,opacity] ease-in-out", // Use muted foreground
        // Removed collapse specific styles
        className
      )}
      {...props}
    />
  );
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean, showOnHover?: boolean } // Added showOnHover
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => { // Default showOnHover to false
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-2 top-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-muted-foreground outline-none ring-offset-background transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&>svg]:size-4 [&>svg]:shrink-0", // Use theme colors
        // Increases hit area
        "after:absolute after:-inset-2 after:md:hidden",
        // Removed collapse specific styles
        // showOnHover &&
        //   "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  );
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> // Use HTMLAttributes
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-0.5 px-1", className)} // Adjusted padding/gap
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
   // Base styles: flex container, alignment, padding, transitions etc.
   "peer/menu-button relative flex w-full items-center justify-start gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-offset-background transition-[width,height,padding,color,background-color] duration-150 ease-in-out hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:bg-sidebar-accent/80 active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
   // Removed icon collapse specific styles
   // Ensure icon size is consistent
   "[&>svg]:size-4 [&>svg]:shrink-0", // Base icon size
  {
    variants: {
      variant: {
        default: "", // Base styles are common
        outline:
          "bg-background border border-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:border-transparent", // Adjusted outline
      },
      size: {
        default: "h-9", // Adjusted height
        sm: "h-8 text-xs", // Adjusted height
        lg: "h-11 text-base", // Adjusted height
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)


type TooltipContentProps = React.ComponentProps<typeof TooltipContent>;

type SidebarMenuButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    isActive?: boolean;
    // Tooltip is no longer needed as sidebar is always expanded on desktop
    // tooltip?: string | Omit<TooltipContentProps, "children"> & { children?: React.ReactNode };
  } & VariantProps<typeof sidebarMenuButtonVariants>;


const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      // tooltip, // Removed tooltip prop
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    // const { isMobile, state } = useSidebar(); // state is no longer needed for tooltip logic

    const buttonElement = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size, className }))}
        {...props}
      >
        {/* Render children directly */}
        {children}
      </Comp>
    );

    // No tooltip logic needed anymore
    return buttonElement;
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton"


const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    showOnHover?: boolean;
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1.5 top-1/2 -translate-y-1/2 flex aspect-square w-6 h-6 items-center justify-center rounded-md p-0 text-muted-foreground outline-none ring-offset-background transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden", // Hit area for mobile
         // Size adjustments based on parent button size
         "peer-data-[size=sm]/menu-button:top-1 peer-data-[size=sm]/menu-button:h-5 peer-data-[size=sm]/menu-button:w-5",
         "peer-data-[size=default]/menu-button:top-1.5", // Already h-6 w-6 by default
         "peer-data-[size=lg]/menu-button:top-[7px] peer-data-[size=lg]/menu-button:h-7 peer-data-[size=lg]/menu-button:w-7", // Adjust top for larger buttons
        // Visibility logic - Simplified as sidebar is always expanded
        // "group-data-[state=collapsed]:group-data-[collapsible=icon]:hidden", // Removed collapse specific styles
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  );
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> // Use HTMLAttributes
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "absolute right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none bg-sidebar-accent", // Style badge
       // Adjust position based on parent button size
       "peer-data-[size=sm]/menu-button:top-1.5",
       "peer-data-[size=default]/menu-button:top-2",
       "peer-data-[size=lg]/menu-button:top-2.5",
      // Removed collapse specific styles
      className
    )}
    {...props}
  />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { // Use HTMLAttributes
    showIcon?: boolean;
    level?: "item" | "subitem";
  }
>(({ className, showIcon = false, level = "item", ...props }, ref) => {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  const height = level === "item" ? "h-9" : "h-7";
  const padding = level === "item" ? "px-2" : "px-2 ml-[1.375rem]"; // Adjust subitem padding

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("rounded-md flex gap-2 items-center", height, padding, className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-sm" // Use sm roundness
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 flex-1 max-w-[--skeleton-width]"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"


const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
       // Use ml based on icon size + gap + half of border width
       "ml-[calc(theme(spacing.4)_+_theme(spacing.2)_+_1px)] flex min-w-0 flex-col gap-0.5 border-l border-sidebar-border pl-2 py-1",
      // Removed collapse specific styles
      className
    )}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
    <li ref={ref} data-sidebar="menu-sub-item" className={cn("relative", className)} {...props} />
))
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"


const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement, // Typically used with Next.js Link, hence anchor
   React.AnchorHTMLAttributes<HTMLAnchorElement> & { // Use Anchor attributes
    asChild?: boolean;
    size?: "sm" | "default"; // Match button sizes more closely
    isActive?: boolean;
  }
>(({ asChild = false, size = "default", isActive, className, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";
  const height = size === "sm" ? "h-7" : "h-8"; // Match item heights
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground/80 outline-none ring-offset-background transition-colors duration-150 ease-in-out hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:bg-sidebar-accent/80 active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-muted-foreground",
        height,
        textSize,
        isActive && "bg-sidebar-accent/70 text-sidebar-accent-foreground font-medium", // Active state style
        // Removed collapse specific styles
        className
      )}
      {...props}
    >
      {children}
      </Comp>
  );
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

// Removed SidebarTrigger from export list
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  // SidebarRail, // Removed Rail export
  SidebarSeparator,
  useSidebar,
};

    