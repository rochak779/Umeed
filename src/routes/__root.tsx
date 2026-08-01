import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { UmeedProvider, useUmeed } from "@/state/UmeedProvider";
import { PushNotification } from "@/components/umeed/PushNotification";
import { HomeIndicator, StatusBar } from "@/components/umeed/DeviceChrome";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="t-title text-text">That page is not here</h1>
      <p className="t-body mt-2 text-text-soft">Let us take you back to the start.</p>
      <Link
        to="/"
        className="t-button mt-6 inline-flex min-h-12 items-center justify-center rounded-[0.875rem] bg-sage px-6 text-white"
      >
        Go home
      </Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="t-title text-text">This screen did not load</h1>
      <p className="t-body mt-2 text-text-soft">You can try again in a moment.</p>
      <button
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="t-button mt-6 inline-flex min-h-12 items-center justify-center rounded-[0.875rem] bg-sage px-6 text-white"
      >
        Try again
      </button>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Umeed" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#F6FAFE" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  const { persona } = useUmeed();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const effective: "child" | "parent" = path.startsWith("/parent") ? "parent" : "child";

  return (
    <div className="flex min-h-[100dvh] justify-center bg-frame sm:items-center sm:py-8">
      {/* iPhone shell: real bezel + rounded screen on larger viewports, edge to edge on a phone */}
      <div className="relative w-full sm:w-auto sm:rounded-[3.2rem] sm:bg-device sm:p-[11px] sm:shadow-[0_30px_70px_-20px_rgba(23,28,31,0.45)]">
        {/* side buttons */}
        <span
          aria-hidden
          className="absolute -left-[3px] top-[124px] hidden h-16 w-[3px] rounded-l-full bg-device sm:block"
        />
        <span
          aria-hidden
          className="absolute -left-[3px] top-[204px] hidden h-16 w-[3px] rounded-l-full bg-device sm:block"
        />
        <span
          aria-hidden
          className="absolute -right-[3px] top-[168px] hidden h-24 w-[3px] rounded-r-full bg-device sm:block"
        />
        <div
          data-persona={effective}
          className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-bg sm:h-[860px] sm:min-h-0 sm:w-[390px] sm:rounded-[2.6rem]"
        >
          <StatusBar persona={effective} />
          <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            <PushNotification />
            {children}
          </div>
          <HomeIndicator />
        </div>
      </div>
    </div>
  );
}


function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <UmeedProvider>
        <PhoneFrame>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </PhoneFrame>
        <Toaster
          position="top-center"
          toastOptions={{
            className:
              "t-body !rounded-[0.875rem] !border !border-line !bg-surface !text-text !shadow-calm",
          }}
        />
      </UmeedProvider>
    </QueryClientProvider>
  );
}
