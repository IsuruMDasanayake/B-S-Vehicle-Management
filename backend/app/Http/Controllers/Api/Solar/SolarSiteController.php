<?php

namespace App\Http\Controllers\Api\Solar;

use App\Http\Controllers\Controller;
use App\Models\SolarSite;
use Illuminate\Http\Request;

class SolarSiteController extends Controller
{
    public function index()
    {
        $sites = SolarSite::withCount('projects')->get();
        return response()->json($sites);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'notes'    => 'nullable|string',
        ]);

        $site = SolarSite::create(array_merge($validated, [
            'supervisor_token' => SolarSite::generateToken(),
        ]));

        return response()->json(['message' => 'Site created', 'data' => $site], 201);
    }

    public function show(SolarSite $solarSite)
    {
        $solarSite->load(['projects.sections']);
        return response()->json($solarSite);
    }

    public function update(Request $request, SolarSite $solarSite)
    {
        $validated = $request->validate([
            'name'      => 'sometimes|required|string|max:255',
            'location'  => 'nullable|string|max:255',
            'notes'     => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $solarSite->update($validated);
        return response()->json(['message' => 'Site updated', 'data' => $solarSite]);
    }

    public function destroy(SolarSite $solarSite)
    {
        $solarSite->delete();
        return response()->json(['message' => 'Site deleted']);
    }

    public function regenerateToken(SolarSite $solarSite)
    {
        $solarSite->update(['supervisor_token' => SolarSite::generateToken()]);
        return response()->json([
            'message' => 'Upload token regenerated. Share the new URL with supervisors.',
            'token'   => $solarSite->supervisor_token,
        ]);
    }
}
