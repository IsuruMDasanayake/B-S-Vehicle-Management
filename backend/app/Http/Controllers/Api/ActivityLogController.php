<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    public function index()
    {
        // Get latest 100 activity logs
        $logs = Activity::with('causer')->latest()->take(100)->get();
        return response()->json(['data' => $logs]);
    }
}
