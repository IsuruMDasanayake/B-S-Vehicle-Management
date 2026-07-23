<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VehicleRequest;
use Illuminate\Http\Request;

class VehicleRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = VehicleRequest::with(['requester:id,name', 'approver:id,name', 'vehicle:id,vehicle_number', 'department:id,name']);
        if ($request->has('approval_status')) $query->where('approval_status', $request->approval_status);
        return response()->json($query->latest()->paginate(15));
    }

    public function publicStore(Request $request)
    {
        $validated = $request->validate([
            'requester_name' => 'required|string|max:255',
            'requester_email' => 'required|email|max:255',
            'requester_contact' => 'required|string|max:50',
            'whatsapp_number' => 'required|string|max:50',
            'requested_vehicle_type' => 'required|string|max:100',
            'request_date' => 'required|date',
            'return_date' => 'required|date|after_or_equal:request_date',
            'payment_frequency' => 'nullable|in:monthly,custom,weekends',
            'id_card_front' => 'required|image|max:5120',
            'id_card_back' => 'required|image|max:5120',
            'drivers_license' => 'required|image|max:5120',
            'residency_bill' => 'nullable|image|max:5120',
        ]);

        $validated['approval_status'] = 'pending';

        if ($request->hasFile('id_card_front')) {
            $validated['id_card_front_path'] = $request->file('id_card_front')->store('vehicle-requests/verification', 'public');
        }
        if ($request->hasFile('id_card_back')) {
            $validated['id_card_back_path'] = $request->file('id_card_back')->store('vehicle-requests/verification', 'public');
        }
        if ($request->hasFile('drivers_license')) {
            $validated['drivers_license_path'] = $request->file('drivers_license')->store('vehicle-requests/verification', 'public');
        }
        if ($request->hasFile('residency_bill')) {
            $validated['residency_bill_path'] = $request->file('residency_bill')->store('vehicle-requests/verification', 'public');
        }

        // Unset the file objects so we don't try to save them in the DB directly
        unset($validated['id_card_front'], $validated['id_card_back'], $validated['drivers_license'], $validated['residency_bill']);

        $vehicle_request = VehicleRequest::create($validated);

        return response()->json(['message' => 'Vehicle request submitted successfully', 'data' => $vehicle_request], 201);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'nullable|exists:departments,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'request_date' => 'required|date',
            'return_date' => 'nullable|date|after_or_equal:request_date',
            'purpose' => 'required|string',
            'destination' => 'nullable|string',
            'approval_status' => 'required|in:pending,approved,rejected',
            'payment_frequency' => 'nullable|in:monthly,custom,weekends',
        ]);
        $validated['requester_id'] = $request->user()->id;
        $vehicle_request = VehicleRequest::create($validated);

        if ($request->hasFile('attachments')) {
            $vehicle_request->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Vehicle request submitted', 'data' => $vehicle_request], 201);
    }

    public function show(VehicleRequest $vehicle_request)
    {
        $vehicle_request->load(['requester', 'approver', 'vehicle', 'department']);
        return response()->json($vehicle_request);
    }

    public function update(Request $request, VehicleRequest $vehicle_request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'department_id' => 'nullable|exists:departments,id',
            'request_date' => 'sometimes|required|date',
            'return_date' => 'nullable|date',
            'purpose' => 'sometimes|required|string',
            'destination' => 'nullable|string',
            'approval_status' => 'sometimes|required|in:pending,approved,rejected',
            'rejection_reason' => 'nullable|string',
            'amount' => 'nullable|numeric',
            'payment_frequency' => 'nullable|in:monthly,custom,weekends'
        ]);

        // Set approver when approving/rejecting
        if (isset($validated['approval_status']) && $validated['approval_status'] !== 'pending') {
            $validated['approved_by'] = $request->user()->id;
            $validated['approved_at'] = now();
        }

        $vehicle_request->update($validated);

        if ($vehicle_request->approval_status === 'approved' && $vehicle_request->vehicle_id) {
            \App\Models\Vehicle::where('id', $vehicle_request->vehicle_id)->update(['current_status' => 'requested']);
            
            \App\Models\VehicleAssignment::create([
                'vehicle_id' => $vehicle_request->vehicle_id,
                'vehicle_request_id' => $vehicle_request->id,
                'driver_id' => null,
                'assigned_by' => $request->user()->id,
                'department_id' => $vehicle_request->department_id,
                'assignment_date' => $vehicle_request->request_date,
                'return_date' => $vehicle_request->return_date,
                'purpose' => $vehicle_request->purpose,
                'status' => 'pending',
                'amount' => $request->input('amount', 0),
                'payment_frequency' => $request->input('payment_frequency', 'monthly')
            ]);
        }

        if ($request->hasFile('attachments')) {
            $vehicle_request->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Vehicle request updated', 'data' => $vehicle_request]);
    }

    public function destroy(VehicleRequest $vehicle_request)
    {
        $vehicle_request->delete();
        return response()->json(['message' => 'Request deleted']);
    }
}
