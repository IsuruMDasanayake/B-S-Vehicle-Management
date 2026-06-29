<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VehicleAssignment;
use Illuminate\Http\Request;

class VehicleAssignmentController extends Controller
{
    public function index(Request $request)
    {
        $query = VehicleAssignment::with(['vehicle:id,vehicle_number', 'driver:id,name', 'department:id,name', 'vehicleRequest:id,requester_name,approval_status']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->latest()->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'driver_id' => 'required_without:vehicle_request_id|nullable|exists:drivers,id',
            'vehicle_request_id' => 'required_without:driver_id|nullable|exists:vehicle_requests,id',
            'department_id' => 'nullable|exists:departments,id',
            'assignment_date' => 'required|date',
            'return_date' => 'nullable|date|after_or_equal:assignment_date',
            'purpose' => 'nullable|string',
            'status' => 'required|in:active,completed,cancelled',
            'notes' => 'nullable|string'
        ]);

        $validated['assigned_by'] = $request->user()->id;
        $assignment = VehicleAssignment::create($validated);

        if ($request->hasFile('attachments')) {
            $assignment->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Assignment created successfully', 'data' => $assignment], 201);
    }

    public function show(VehicleAssignment $assignment)
    {
        $assignment->load(['vehicle', 'driver', 'department', 'vehicleRequest']);
        return response()->json($assignment);
    }

    public function update(Request $request, VehicleAssignment $assignment)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'driver_id' => 'sometimes|required_without:vehicle_request_id|nullable|exists:drivers,id',
            'vehicle_request_id' => 'sometimes|required_without:driver_id|nullable|exists:vehicle_requests,id',
            'department_id' => 'nullable|exists:departments,id',
            'assignment_date' => 'sometimes|required|date',
            'return_date' => 'nullable|date|after_or_equal:assignment_date',
            'purpose' => 'nullable|string',
            'status' => 'sometimes|required|in:active,completed,cancelled',
            'notes' => 'nullable|string'
        ]);

        $assignment->update($validated);

        if ($request->hasFile('attachments')) {
            $assignment->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Assignment updated successfully', 'data' => $assignment]);
    }

    public function destroy(VehicleAssignment $assignment)
    {
        $assignment->delete();
        return response()->json(['message' => 'Assignment deleted successfully']);
    }
}
