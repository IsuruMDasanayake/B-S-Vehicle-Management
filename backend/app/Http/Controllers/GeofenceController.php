<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Geofence;
use Illuminate\Support\Facades\Validator;

class GeofenceController extends Controller
{
    public function index()
    {
        $geofences = Geofence::with('vehicles')->get();
        return response()->json($geofences);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|in:polygon,circle',
            'coordinates' => 'required|array',
            'radius' => 'nullable|numeric',
            'alert_type' => 'required|in:entry,exit,both',
            'color' => 'nullable|string',
            'is_active' => 'boolean',
            'vehicles' => 'array',
            'vehicles.*' => 'exists:vehicles,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $geofence = Geofence::create($request->except('vehicles'));

        if ($request->has('vehicles')) {
            $geofence->vehicles()->sync($request->vehicles);
        }

        return response()->json($geofence->load('vehicles'), 201);
    }

    public function update(Request $request, $id)
    {
        $geofence = Geofence::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'type' => 'in:polygon,circle',
            'coordinates' => 'array',
            'radius' => 'nullable|numeric',
            'alert_type' => 'in:entry,exit,both',
            'color' => 'string',
            'is_active' => 'boolean',
            'vehicles' => 'array',
            'vehicles.*' => 'exists:vehicles,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $geofence->update($request->except('vehicles'));

        if ($request->has('vehicles')) {
            $geofence->vehicles()->sync($request->vehicles);
        }

        return response()->json($geofence->load('vehicles'));
    }

    public function destroy($id)
    {
        $geofence = Geofence::findOrFail($id);
        $geofence->delete();

        return response()->json(['message' => 'Geofence deleted successfully']);
    }
}
