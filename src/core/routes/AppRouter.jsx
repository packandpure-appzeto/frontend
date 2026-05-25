import { useMemo } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
import RootErrorBoundary from '@shared/components/RootErrorBoundary';
import AppProviders from '@core/AppProviders';
import { authRoutes, roleModuleRoutes } from './moduleRoutes';
import { customerRouteChildren } from './customer/customerRouteConfig';

const UnauthorizedPage = () => (
  <div className="flex h-screen items-center justify-center font-outfit">
    Unauthorized Access
  </div>
);

const AppRouter = () => {
  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          path: '/',
          element: (
            <AppProviders>
              <Outlet />
            </AppProviders>
          ),
          errorElement: <RootErrorBoundary />,
          children: [
            ...authRoutes,
            ...roleModuleRoutes,
            { path: 'unauthorized', element: <UnauthorizedPage /> },
            ...customerRouteChildren,
            { path: '*', element: <Navigate to="/" replace /> },
          ],
        },
      ]),
    [],
  );

  return <RouterProvider router={router} />;
};

export default AppRouter;
 