<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FuelEntry;
use Illuminate\Http\Request;

class FuelEntryController extends Controller
{
    public function index(Request $request)
    {
        $query = FuelEntry::with(['vehicle:id,vehicle_number', 'driver:id,name']);

        if ($request->has('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        return response()->json($query->latest('fill_date')->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'driver_id' => 'required|exists:drivers,id',
            'fill_date' => 'required|date',
            'fuel_type' => 'required|in:petrol,diesel,electric,hybrid,cng',
            'quantity' => 'required|numeric',
            'unit_price' => 'required|numeric',
            'total_cost' => 'required|numeric',
            'current_odometer' => 'required|numeric',
            'station_name' => 'nullable|string',
            'receipt_number' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $entry = FuelEntry::create($validated);

        // Update vehicle odometer
        $entry->vehicle()->update(['current_odometer' => $validated['current_odometer']]);

        return response()->json(['message' => 'Fuel entry created successfully', 'data' => $entry], 201);
    }

    public function show(FuelEntry $fuel_entry)
    {
        $fuel_entry->load(['vehicle', 'driver']);
        return response()->json($fuel_entry);
    }

    public function update(Request $request, FuelEntry $fuel_entry)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'driver_id' => 'sometimes|required|exists:drivers,id',
            'fill_date' => 'sometimes|required|date',
            'fuel_type' => 'sometimes|required|in:petrol,diesel,electric,hybrid,cng',
            'quantity' => 'sometimes|required|numeric',
            'unit_price' => 'sometimes|required|numeric',
            'total_cost' => 'sometimes|required|numeric',
            'current_odometer' => 'sometimes|required|numeric',
            'station_name' => 'nullable|string',
            'receipt_number' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $fuel_entry->update($validated);

        if ($request->hasFile('attachments')) {
            $fuel_entry->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Fuel entry updated successfully', 'data' => $fuel_entry]);
    }

    public function destroy(FuelEntry $fuel_entry)
    {
        $fuel_entry->delete();
        return response()->json(['message' => 'Fuel entry deleted successfully']);
    }
}
