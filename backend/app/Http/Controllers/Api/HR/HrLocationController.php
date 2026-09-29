<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrLocation;
use Illuminate\Http\Request;

class HrLocationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(HrLocation::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'radius_meters' => 'nullable|integer',
            'status' => 'nullable|in:active,inactive',
        ]);

        $location = HrLocation::create($validated);
        return response()->json($location, 201);
    }

    public function update(Request $request, HrLocation $location)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'latitude' => 'sometimes|required|numeric',
            'longitude' => 'sometimes|required|numeric',
            'radius_meters' => 'nullable|integer',
            'status' => 'nullable|in:active,inactive',
        ]);

        $location->update($validated);
        return response()->json($location);
    }

    public function destroy(HrLocation $location)
    {
        $location->delete();
        return response()->json(null, 204);
    }
}
