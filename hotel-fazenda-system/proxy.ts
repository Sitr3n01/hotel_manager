import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static, _next/image, favicon.ico
     * - the service worker file, workbox helpers, manifest, icons
     * - image files
     * The middleware still runs for /api routes that are not in PUBLIC_PATHS.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-.*\\.js|manifest.webmanifest|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
