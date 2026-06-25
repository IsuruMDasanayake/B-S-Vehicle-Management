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
            $query->where('vehicle_id', $request->vehicle_id);
        }

        return response()->json($query->orderBy('payment_month', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'payment_month' => 'required|string|max:10', // e.g. "2026-06"
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
            'payment_month' => 'sometimes|required|string|max:10',
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
