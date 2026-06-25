<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceRecord;
use Illuminate\Http\Request;

class MaintenanceRecordController extends Controller
{
    public function index(Request $request)
    {
        $query = MaintenanceRecord::with(['vehicle:id,vehicle_number', 'vendor:id,name']);

        if ($request->has('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->latest('service_date')->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'vendor_id' => 'nullable|exists:vendors,id',
            'service_type' => 'required|in:routine,repair,inspection,emergency',
            'service_date' => 'required|date',
            'odometer_reading' => 'required|numeric',
            'description' => 'required|string',
            'cost' => 'required|numeric',
            'next_service_date' => 'nullable|date',
            'next_service_km' => 'nullable|numeric',
            'status' => 'required|in:scheduled,in_progress,completed,cancelled',
            'notes' => 'nullable|string'
        ]);

        $record = MaintenanceRecord::create($validated);

        if ($validated['status'] === 'completed') {
            $record->vehicle()->update(['current_status' => 'available']);
        } elseif (in_array($validated['status'], ['scheduled', 'in_progress'])) {
            $record->vehicle()->update(['current_status' => 'under_maintenance']);
        }

        if ($request->hasFile('attachments')) {
            $record->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Maintenance record created successfully', 'data' => $record], 201);
    }

    public function show(MaintenanceRecord $maintenance_record)
    {
        $maintenance_record->load(['vehicle', 'vendor']);
        return response()->json($maintenance_record);
    }

    public function update(Request $request, MaintenanceRecord $maintenance_record)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'vendor_id' => 'nullable|exists:vendors,id',
            'service_type' => 'sometimes|required|in:routine,repair,inspection,emergency',
            'service_date' => 'sometimes|required|date',
            'odometer_reading' => 'sometimes|required|numeric',
            'description' => 'sometimes|required|string',
            'cost' => 'sometimes|required|numeric',
            'next_service_date' => 'nullable|date',
            'next_service_km' => 'nullable|numeric',
            'status' => 'sometimes|required|in:scheduled,in_progress,completed,cancelled',
            'notes' => 'nullable|string',
            'attachments.*' => 'nullable|file|max:5120'
        ]);

        $maintenance_record->update($validated);

        if (isset($validated['status'])) {
            if ($validated['status'] === 'completed') {
                $maintenance_record->vehicle()->update(['current_status' => 'available']);
            } elseif (in_array($validated['status'], ['scheduled', 'in_progress'])) {
                $maintenance_record->vehicle()->update(['current_status' => 'under_maintenance']);
            }
        }

        if ($request->hasFile('attachments')) {
            $maintenance_record->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Maintenance record updated successfully', 'data' => $maintenance_record]);
    }

    public function destroy(MaintenanceRecord $maintenance_record)
    {
        $maintenance_record->delete();
        return response()->json(['message' => 'Maintenance record deleted successfully']);
    }
}
