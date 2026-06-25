<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    public function index(Request $request)
    {
        $query = Vehicle::with('hiredDetails');

        if ($request->has('ownership')) {
            $query->where('ownership', $request->ownership);
        }

        if ($request->has('status')) {
            $query->where('current_status', $request->status);
        }

        if ($request->has('type')) {
            $query->where('vehicle_type', $request->type);
        }

        return response()->json($query->latest()->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_number' => 'required|unique:vehicles',
            'registration_number' => 'required|unique:vehicles',
            'vehicle_type' => 'required|string',
            'vehicle_category' => 'required|string',
            'brand' => 'required|string',
            'model' => 'required|string',
            'manufacturing_year' => 'required|integer',
            'chassis_number' => 'required|unique:vehicles',
            'engine_number' => 'required|unique:vehicles',
            'fuel_type' => 'required|in:petrol,diesel,electric,hybrid,cng',
            'seating_capacity' => 'nullable|integer',
            'engine_capacity' => 'nullable|string',
            'color' => 'nullable|string',
            'purchase_date' => 'nullable|date',
            'purchase_cost' => 'nullable|numeric',
            'current_status' => 'required|in:available,in_use,under_maintenance,out_of_service,sold',
            'ownership' => 'required|in:B&S Transports,Hired',
            'notes' => 'nullable|string',
            'current_odometer' => 'nullable|numeric',
            'hired_details.owner_name' => 'nullable|string|required_if:ownership,Hired',
            'hired_details.contact_no' => 'nullable|string|required_if:ownership,Hired',
            'hired_details.email' => 'nullable|email',
            'hired_details.address' => 'nullable|string|required_if:ownership,Hired',
            'hired_details.emergency_person' => 'nullable|string|required_if:ownership,Hired',
            'hired_details.emergency_contact' => 'nullable|string|required_if:ownership,Hired',
            'hired_details.monthly_amount' => 'nullable|numeric|required_if:ownership,Hired',
        ]);

        $vehicle = Vehicle::create($validated);

        if ($request->ownership === 'Hired' && $request->has('hired_details')) {
            $vehicle->hiredDetails()->create($request->input('hired_details'));
        }

        if ($request->hasFile('attachments')) {
            $vehicle->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Vehicle created successfully', 'data' => $vehicle], 201);
    }

    public function show(Vehicle $vehicle)
    {
        $vehicle->load(['assignments.driver', 'maintenanceRecords', 'fuelEntries', 'inspections', 'hiredDetails']);
        return response()->json($vehicle);
    }

    public function update(Request $request, Vehicle $vehicle)
    {
        $validated = $request->validate([
            'vehicle_number' => 'sometimes|required|unique:vehicles,vehicle_number,'.$vehicle->id,
            'registration_number' => 'sometimes|required|unique:vehicles,registration_number,'.$vehicle->id,
            'vehicle_type' => 'sometimes|required|string',
            'vehicle_category' => 'sometimes|required|string',
            'brand' => 'sometimes|required|string',
            'model' => 'sometimes|required|string',
            'manufacturing_year' => 'sometimes|required|integer',
            'chassis_number' => 'sometimes|required|unique:vehicles,chassis_number,'.$vehicle->id,
            'engine_number' => 'sometimes|required|unique:vehicles,engine_number,'.$vehicle->id,
            'fuel_type' => 'sometimes|required|in:petrol,diesel,electric,hybrid,cng',
            'seating_capacity' => 'nullable|integer',
            'engine_capacity' => 'nullable|string',
            'color' => 'nullable|string',
            'purchase_date' => 'nullable|date',
            'purchase_cost' => 'nullable|numeric',
            'current_status' => 'sometimes|required|in:available,in_use,under_maintenance,out_of_service,sold',
            'ownership' => 'sometimes|required|in:B&S Transports,Hired',
            'notes' => 'nullable|string',
            'current_odometer' => 'nullable|numeric',
            'hired_details.owner_name' => 'nullable|string|required_if:ownership,Hired',
            'hired_details.contact_no' => 'nullable|string|required_if:ownership,Hired',
            'hired_details.email' => 'nullable|email',
            'hired_details.address' => 'nullable|string|required_if:ownership,Hired',
            'hired_details.emergency_person' => 'nullable|string|required_if:ownership,Hired',
            'hired_details.emergency_contact' => 'nullable|string|required_if:ownership,Hired',
            'hired_details.monthly_amount' => 'nullable|numeric|required_if:ownership,Hired',
        ]);

        $vehicle->update($validated);

        if ($request->ownership === 'Hired' && $request->has('hired_details')) {
            $vehicle->hiredDetails()->updateOrCreate(
                ['vehicle_id' => $vehicle->id],
                $request->input('hired_details')
            );
        } elseif ($request->ownership === 'B&S Transports') {
            $vehicle->hiredDetails()->delete();
        }

        if ($request->hasFile('attachments')) {
            $vehicle->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Vehicle updated successfully', 'data' => $vehicle]);
    }

    public function destroy(Vehicle $vehicle)
    {
        $vehicle->delete();
        return response()->json(['message' => 'Vehicle deleted successfully']);
    }
}
