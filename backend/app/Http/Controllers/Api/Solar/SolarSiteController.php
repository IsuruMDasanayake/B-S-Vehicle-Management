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

    public function show(SolarSite $site)
    {
        $site->load(['projects.sections']);
        return response()->json($site);
    }

    public function update(Request $request, SolarSite $site)
    {
        $validated = $request->validate([
            'name'      => 'sometimes|required|string|max:255',
            'location'  => 'nullable|string|max:255',
            'notes'     => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $site->update($validated);
        return response()->json(['message' => 'Site updated', 'data' => $site]);
    }

    public function destroy(SolarSite $site)
    {
        $site->delete();
        return response()->json(['message' => 'Site deleted']);
    }

    public function regenerateToken(SolarSite $site)
    {
        $site->update(['supervisor_token' => SolarSite::generateToken()]);
        return response()->json([
            'message' => 'Upload token regenerated. Share the new URL with supervisors.',
            'token'   => $site->supervisor_token,
        ]);
    }
}
