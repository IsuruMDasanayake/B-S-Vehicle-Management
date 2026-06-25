<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tire;
use Illuminate\Http\Request;

class TireController extends Controller
{
    public function index(Request $request)
    {
        $query = Tire::with(['vehicle:id,vehicle_number']);
        if ($request->has('vehicle_id')) $query->where('vehicle_id', $request->vehicle_id);
        return response()->json($query->latest()->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'tire_brand' => 'required|string',
            'tire_size' => 'required|string',
            'position' => 'required|string',
            'installation_date' => 'required|date',
            'installation_mileage' => 'required|numeric',
            'replacement_date' => 'nullable|date',
            'replacement_mileage' => 'nullable|numeric',
            'status' => 'required|in:good,worn,replaced',
            'notes' => 'nullable|string',
        ]);
        $tire = Tire::create($validated);

        if ($request->hasFile('attachments')) {
            $tire->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Tire record created', 'data' => $tire], 201);
    }

    public function show(Tire $tire)
    {
        $tire->load('vehicle');
        return response()->json($tire);
    }

    public function update(Request $request, Tire $tire)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'tire_brand' => 'sometimes|required|string',
            'tire_size' => 'sometimes|required|string',
            'position' => 'sometimes|required|string',
            'installation_date' => 'sometimes|required|date',
            'installation_mileage' => 'sometimes|required|numeric',
            'replacement_date' => 'nullable|date',
            'replacement_mileage' => 'nullable|numeric',
            'status' => 'sometimes|required|in:good,worn,replaced',
            'notes' => 'nullable|string',
        ]);
        $tire->update($validated);

        if ($request->hasFile('attachments')) {
            $tire->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Tire record updated', 'data' => $tire]);
    }

    public function destroy(Tire $tire)
    {
        $tire->delete();
        return response()->json(['message' => 'Tire record deleted']);
    }
}
