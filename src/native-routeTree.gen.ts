/* Native client route tree: intentionally excludes the server-only /api/chat endpoint. */
import { Route as rootRouteImport } from "./routes/__root";
import { Route as IndexRouteImport } from "./routes/index";
import { Route as DownloadRouteImport } from "./routes/download";
import { Route as InviteTokenRouteImport } from "./routes/invite.$token";

const IndexRoute = IndexRouteImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRouteImport,
} as any);

const DownloadRoute = DownloadRouteImport.update({
  id: "/download",
  path: "/download",
  getParentRoute: () => rootRouteImport,
} as any);

const InviteTokenRoute = InviteTokenRouteImport.update({
  id: "/invite/$token",
  path: "/invite/$token",
  getParentRoute: () => rootRouteImport,
} as any);

export const nativeRouteTree = rootRouteImport._addFileChildren({
  IndexRoute,
  DownloadRoute,
  InviteTokenRoute,
} as any);
