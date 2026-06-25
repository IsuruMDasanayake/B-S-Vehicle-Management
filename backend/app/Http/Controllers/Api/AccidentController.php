<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accident;
use Illuminate\Http\Request;

class AccidentController extends Controller
{
    public function index(Request $request)
    {
        $query = Accident::with(['vehicle:id,vehicle_number', 'driver:id,name']);
        if ($request->has('status')) $query->where('status', $request->status);
        return response()->json($query->latest('accident_date')->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'driver_id' => 'required|exists:drivers,id',
            'accident_date' => 'required|date',
            'location' => 'required|string',
            'description' => 'required|string',
            'police_report_number' => 'nullable|string',
            'insurance_claim_number' => 'nullable|string',
            'repair_cost' => 'nullable|numeric',
            'status' => 'required|in:reported,under_investigation,resolved',
            'notes' => 'nullable|string',
        ]);
        $accident = Accident::create($validated);

        if ($request->hasFile('attachments')) {
            $accident->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Accident reported successfully', 'data' => $accident], 201);
    }

    public function show(Accident $accident)
    {
        $accident->load(['vehicle', 'driver']);
        return response()->json($accident);
    }

    public function update(Request $request, Accident $accident)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'driver_id' => 'sometimes|required|exists:drivers,id',
            'accident_date' => 'sometimes|required|date',
            'location' => 'sometimes|required|string',
            'description' => 'sometimes|required|string',
            'police_report_number' => 'nullable|string',
            'insurance_claim_number' => 'nullable|string',
            'repair_cost' => 'nullable|numeric',
            'status' => 'sometimes|required|in:reported,under_investigation,resolved',
            'notes' => 'nullable|string',
        ]);
        $accident->update($validated);

        if ($request->hasFile('attachments')) {
            $accident->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Accident updated successfully', 'data' => $accident]);
    }

    public function destroy(Accident $accident)
    {
        $accident->delete();
        return response()->json(['message' => 'Accident deleted']);
    }
}
