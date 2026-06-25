<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OwnerPayment;
use Illuminate\Http\Request;

class OwnerPaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = OwnerPayment::with('vehicle:id,vehicle_number');

        if ($request->has('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        // Order by latest payment month first
        return response()->json($query->orderBy('payment_month', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'payment_month' => 'required|string|max:10', // e.g. "2026-04"
            'amount' => 'required|numeric',
            'status' => 'required|in:paid,pending,ongoing',
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);

        $payment = OwnerPayment::create($validated);

        if ($request->hasFile('attachments')) {
            $payment->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Payment recorded successfully', 'data' => $payment->load('attachments')], 201);
    }

    public function show(OwnerPayment $ownerPayment)
    {
        return response()->json($ownerPayment->load('attachments'));
    }

    public function update(Request $request, OwnerPayment $ownerPayment)
    {
        $validated = $request->validate([
            'payment_month' => 'sometimes|required|string|max:10',
            'amount' => 'sometimes|required|numeric',
            'status' => 'sometimes|required|in:paid,pending,ongoing',
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);

        $ownerPayment->update($validated);

        if ($request->hasFile('attachments')) {
            $ownerPayment->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Payment updated successfully', 'data' => $ownerPayment->load('attachments')]);
    }

    public function destroy(OwnerPayment $ownerPayment)
    {
        $ownerPayment->delete();
        return response()->json(['message' => 'Payment deleted successfully']);
    }
}
