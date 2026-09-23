<?php

namespace App\Http\Controllers\Api\Solar;

use App\Http\Controllers\Controller;
use App\Models\SolarSite;
use App\Models\SolarProject;
use App\Models\SolarUploadBatch;
use App\Models\SolarImage;

class SolarDashboardController extends Controller
{
    public function stats()
    {
        $totalSites    = SolarSite::count();
        $activeSites   = SolarSite::where('is_active', true)->count();
        $totalProjects = SolarProject::count();
        $activeProjects = SolarProject::where('status', 'active')->count();
        $totalImages   = SolarImage::count();
        $todayImages   = SolarImage::whereDate('created_at', today())->count();

        $recentBatches = SolarUploadBatch::with(['images', 'section.project.site'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'total_sites'     => $totalSites,
            'active_sites'    => $activeSites,
            'total_projects'  => $totalProjects,
            'active_projects' => $activeProjects,
            'total_images'    => $totalImages,
            'today_images'    => $todayImages,
            'recent_activity' => $recentBatches,
        ]);
    }
}
