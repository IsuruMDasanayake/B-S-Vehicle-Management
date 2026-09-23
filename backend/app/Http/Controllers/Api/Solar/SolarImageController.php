<?php

namespace App\Http\Controllers\Api\Solar;

use App\Http\Controllers\Controller;
use App\Models\SolarImage;
use App\Notifications\SiteSupervisorNotification;
use Illuminate\Http\Request;

class SolarImageController extends Controller
{
    public function flag(Request $request, SolarImage $solarImage)
    {
        $validated = $request->validate([
            'is_flagged'   => 'required|boolean',
            'flag_reason'  => 'nullable|string|max:500',
        ]);

        $solarImage->update($validated);

        if ($validated['is_flagged']) {
            $site = $solarImage->batch->section->project->site ?? null;
            if ($site) {
                $reason = $validated['flag_reason'] ?? 'Please check this image.';
                $message = "An image in " . ($solarImage->batch->section->name ?? 'a milestone') . " has been flagged. Reason: {$reason}";
                $site->notify(new SiteSupervisorNotification(
                    'Image Flagged',
                    $message,
                    'warning',
                    $request->user()->name ?? 'Admin'
                ));
            }
        }

        return response()->json(['message' => 'Image flag updated', 'data' => $solarImage]);
    }

    public function destroy(Request $request, SolarImage $solarImage)
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'super_admin' && !$user->hasRole('super_admin'))) {
            abort(403, 'Unauthorized. Super Admin access required.');
        }

        $path = storage_path('app/public/' . $solarImage->image_path);
        if (file_exists($path)) {
            unlink($path);
        }
        $solarImage->delete();
        return response()->json(['message' => 'Image deleted']);
    }
}
