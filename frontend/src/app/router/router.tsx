import { ErrorPageComponent } from '@pages/errors/5xx-error/server-error.component'
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router'

import { ErrorBoundaryHoc } from '@shared/hocs/error-boundary'

import { RootLayout } from '../layouts/root/root.layout'
import { RouteSwitch } from './route-switch'

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route element={<ErrorBoundaryHoc fallback={<ErrorPageComponent />} />}>
            <Route element={<RootLayout />} path="*">
                <Route element={<RouteSwitch />} path="*" />
            </Route>
        </Route>
    )
)

export function Router() {
    return <RouterProvider router={router} />
}
