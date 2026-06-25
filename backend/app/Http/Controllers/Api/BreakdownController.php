<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Breakdown;
use Illuminate\Http\Request;

class BreakdownController extends Controller
{
    public function index(Request $request)
    {
        $query = Breakdown::with(['vehicle:id,vehicle_number', 'driver:id,name']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->latest('breakdown_date')->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'driver_id' => 'required|exists:drivers,id',
            'breakdown_date' => 'required|date',
            'location' => 'required|string',
            'description' => 'required|string',
            'action_taken' => 'nullable|string',
            'towing_required' => 'boolean',
            'status' => 'required|in:reported,towing,in_repair,resolved',
            'notes' => 'nullable|string'
        ]);

        $breakdown = Breakdown::create($validated);

        if ($validated['status'] !== 'resolved') {
            $breakdown->vehicle()->update(['current_status' => 'out_of_service']);
        }

        if ($request->hasFile('attachments')) {
            $breakdown->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Breakdown reported successfully', 'data' => $breakdown], 201);
    }

    public function show(Breakdown $breakdown)
    {
        $breakdown->load(['vehicle', 'driver']);
        return response()->json($breakdown);
    }

    public function update(Request $request, Breakdown $breakdown)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'driver_id' => 'sometimes|required|exists:drivers,id',
            'breakdown_date' => 'sometimes|required|date',
            'location' => 'sometimes|required|string',
            'description' => 'sometimes|required|string',
            'action_taken' => 'nullable|string',
            'towing_required' => 'boolean',
            'status' => 'sometimes|required|in:reported,towing,in_repair,resolved',
            'notes' => 'nullable|string'
        ]);

        $breakdown->update($validated);

        if (isset($validated['status'])) {
            if ($validated['status'] === 'resolved') {
                $breakdown->vehicle()->update(['current_status' => 'available']);
            } else {
                $breakdown->vehicle()->update(['current_status' => 'out_of_service']);
            }
        }

        if ($request->hasFile('attachments')) {
            $breakdown->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Breakdown updated successfully', 'data' => $breakdown]);
    }

    public function destroy(Breakdown $breakdown)
    {
        $breakdown->delete();
        return response()->json(['message' => 'Breakdown deleted successfully']);
    }
}
