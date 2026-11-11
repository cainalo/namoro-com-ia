import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { nativeRouteTree } from "./native-routeTree.gen";

export function getNativeRouter() {
  const queryClient = new QueryClient();
  return createRouter({
    routeTree: nativeRouteTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
}
