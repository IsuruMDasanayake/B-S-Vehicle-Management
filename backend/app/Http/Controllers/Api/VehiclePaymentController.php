<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VehiclePayment;
use Illuminate\Http\Request;

class VehiclePaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = VehiclePayment::with('vehicle:id,vehicle_number');

        if ($request->has('vehicle_id')) {
            $vehicle_id = $request->vehicle_id;
            $query->where('vehicle_id', $vehicle_id);

            // Auto-generate missing monthly payments if currently assigned
            $vehicle = \App\Models\Vehicle::with('currentAssignment')->find($vehicle_id);
            if ($vehicle && $vehicle->currentAssignment && $vehicle->currentAssignment->amount > 0 && $vehicle->currentAssignment->payment_frequency === 'monthly') {
                $assignment = $vehicle->currentAssignment;
                $startDate = \Carbon\Carbon::parse($assignment->assignment_date)->startOfMonth();
                $endDate = \Carbon\Carbon::now()->startOfMonth();

                $currentDate = $startDate->copy();
                while ($currentDate->lte($endDate)) {
                    $monthStr = $currentDate->format('Y-m');
                    $exists = \App\Models\VehiclePayment::where('vehicle_id', $vehicle_id)
                        ->where('rental_period', $monthStr)
                        ->exists();

                    if (!$exists) {
                        \App\Models\VehiclePayment::create([
                            'vehicle_id' => $vehicle_id,
                            'rental_period' => $monthStr,
                            'amount' => $assignment->amount,
                            'status' => 'pending',
                            'payer_name' => $assignment->driver_id ? $assignment->driver()->value('name') : ($assignment->vehicle_request_id ? $assignment->vehicleRequest()->value('requester_name') : 'Unknown')
                        ]);
                    }
                    $currentDate->addMonth();
                }
            }
        }

        return response()->json($query->orderBy('rental_period', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'rental_period' => 'required|string|max:255', // e.g. "2026-06" or "2026-07-01 to 2026-07-05"
            'amount' => 'required|numeric',
            'status' => 'required|in:paid,pending',
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);

        $payment = VehiclePayment::create($validated);

        if ($request->hasFile('attachments')) {
            $payment->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Payment recorded successfully', 'data' => $payment->load('attachments')], 201);
    }

    public function show(VehiclePayment $vehiclePayment)
    {
        return response()->json($vehiclePayment->load('attachments'));
    }

    public function update(Request $request, VehiclePayment $vehiclePayment)
    {
        $validated = $request->validate([
            'rental_period' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric',
            'status' => 'sometimes|required|in:paid,pending',
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);

        $vehiclePayment->update($validated);

        if ($request->hasFile('attachments')) {
            $vehiclePayment->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Payment updated successfully', 'data' => $vehiclePayment->load('attachments')]);
    }

    public function destroy(VehiclePayment $vehiclePayment)
    {
        $vehiclePayment->delete();
        return response()->json(['message' => 'Payment deleted successfully']);
    }
}
