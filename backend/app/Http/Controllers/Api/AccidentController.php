<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accident;
use Illuminate\Http\Request;

class AccidentController extends Controller
{
    public function index(Request $request)
    {
        $query = Accident::with(['vehicle:id,vehicle_number', 'driver:id,name', 'vehicleRequest:id,requester_name']);
        if ($request->has('status')) $query->where('status', $request->status);
        return response()->json($query->latest('accident_date')->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'assignee_type' => 'required|in:internal,external,manual',
            'driver_id' => 'nullable|exists:drivers,id',
            'vehicle_request_id' => 'nullable|exists:vehicle_requests,id',
            'driver_name' => 'nullable|string',
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

        if ($request->hasFile('police_report')) {
            $path = $request->file('police_report')->store('accidents/police_reports', 'public');
            $accident->update(['police_report_path' => $path]);
        }

        if ($request->hasFile('accident_photos')) {
            $photos = [];
            foreach ($request->file('accident_photos') as $photo) {
                $photos[] = $photo->store('accidents/photos', 'public');
            }
            $accident->update(['photos' => $photos]);
        }

        return response()->json(['message' => 'Accident reported successfully', 'data' => $accident], 201);
    }

    public function show(Accident $accident)
    {
        $accident->load(['vehicle', 'driver', 'vehicleRequest']);
        return response()->json($accident);
    }

    public function update(Request $request, Accident $accident)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'assignee_type' => 'sometimes|required|in:internal,external,manual',
            'driver_id' => 'nullable|exists:drivers,id',
            'vehicle_request_id' => 'nullable|exists:vehicle_requests,id',
            'driver_name' => 'nullable|string',
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

        if ($request->hasFile('police_report')) {
            $path = $request->file('police_report')->store('accidents/police_reports', 'public');
            $accident->update(['police_report_path' => $path]);
        }

        if ($request->hasFile('accident_photos')) {
            $photos = $accident->photos ?? [];
            foreach ($request->file('accident_photos') as $photo) {
                $photos[] = $photo->store('accidents/photos', 'public');
            }
            $accident->update(['photos' => $photos]);
        }

        return response()->json(['message' => 'Accident updated successfully', 'data' => $accident]);
    }

    public function destroy(Accident $accident)
    {
        $accident->delete();
        return response()->json(['message' => 'Accident deleted']);
    }

    public function removePhoto(Request $request, Accident $accident, $index)
    {
        $photos = $accident->photos ?? [];
        if (isset($photos[$index])) {
            unset($photos[$index]);
            $accident->update(['photos' => array_values($photos)]);
            return response()->json(['message' => 'Photo removed successfully']);
        }
        return response()->json(['message' => 'Photo not found'], 404);
    }

    public function removePoliceReport(Accident $accident)
    {
        if ($accident->police_report_path) {
            $accident->update(['police_report_path' => null]);
            return response()->json(['message' => 'Police report removed successfully']);
        }
        return response()->json(['message' => 'No police report found'], 404);
    }
}
