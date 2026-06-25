# Separate GPS Tracking into a Dedicated Dashboard

This plan addresses the requirement to remove the GPS Tracking page from the main dashboard and create a separate, dedicated dashboard specifically for GPS Tracking, complete with its own sidebar.

## Proposed Changes

### 1. Main Dashboard Sidebar Updates
#### [MODIFY] [Sidebar.jsx](file:///d:/React%20Projects/B&S%20Vehicle%20Management/frontend/src/components/layout/Sidebar.jsx)
- Remove the "GPS Tracking" link from the Main section of the sidebar so it no longer appears in the primary dashboard layout.

### 2. New GPS Dashboard Components
We will create a new layout specific to the GPS module inside the `frontend/src/pages/Gps` folder.

#### [NEW] [GpsLayout.jsx](file:///d:/React%20Projects/B&S%20Vehicle%20Management/frontend/src/pages/Gps/GpsLayout.jsx)
- A layout component similar to the main `Layout.jsx`, but it will use `GpsSidebar` instead of `Sidebar`. It will reuse the global `Navbar` component for consistency.

#### [NEW] [GpsSidebar.jsx](file:///d:/React%20Projects/B&S%20Vehicle%20Management/frontend/src/pages/Gps/GpsSidebar.jsx)
- A dedicated sidebar for the GPS Dashboard. It will include links specific to GPS operations, such as:
  - Live Map
  - History / Playback (Placeholder)
  - Geofences (Placeholder)
  - Settings (Placeholder)
  - A "Back to Portal" link to easily return to the main selection screen.

#### [MODIFY/RENAME] [GpsDashboard.jsx](file:///d:/React%20Projects/B&S%20Vehicle%20Management/frontend/src/pages/Gps/GpsDashboard.jsx)
- We will rename/refactor the current `GpsTracking.jsx` into `GpsDashboard.jsx` (or keep it as the index route inside the new layout). It will contain the live map and active vehicle list.

### 3. Routing Updates
#### [MODIFY] [App.jsx](file:///d:/React%20Projects/B&S%20Vehicle%20Management/frontend/src/App.jsx)
- Update the routing so that `/gps` uses the new `GpsLayout` rather than the main `Layout`.
- Add a nested route for the live tracking map view.

### 4. Portal Navigation
#### [MODIFY] [Portal.jsx](file:///d:/React%20Projects/B&S%20Vehicle%20Management/frontend/src/pages/Portal/Portal.jsx)
- No significant changes needed here as the GPS card already navigates to `/gps`. It will now correctly load the new dedicated dashboard layout.

## User Review Required

> [!IMPORTANT]  
> Please review the sidebar links proposed for the new GPS Dashboard (`Live Map`, `History`, `Geofences`, `Back to Portal`). Are there any other specific links you would like to include in the new GPS Sidebar?

## Verification Plan
- Navigate to the Portal and click "Live GPS Tracking". Verify it loads a new layout with a distinct sidebar.
- Verify that "GPS Tracking" is no longer visible in the main dashboard sidebar.
- Verify the "Back to Portal" link in the GPS sidebar correctly returns the user to the portal.
