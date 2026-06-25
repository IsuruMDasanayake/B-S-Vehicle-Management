<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\AlertGeneratorService;

class NotificationGeneratorController extends Controller
{
    /**
     * Generate alerts manually.
     */
    public function generate(Request $request, AlertGeneratorService $service)
    {
        $service->generateAlerts();

        return response()->json([
            'message' => 'Alerts generated successfully.'
        ]);
    }
}
