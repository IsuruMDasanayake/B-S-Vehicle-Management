<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    public function index(Request $request)
    {
        $query = Driver::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->latest()->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'nic_number' => 'required|unique:drivers',
            'address' => 'nullable|string',
            'contact_number' => 'required|string',
            'license_number' => 'required|unique:drivers',
            'license_expiry_date' => 'required|date',
            'photo' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string',
            'emergency_contact_phone' => 'nullable|string',
            'status' => 'required|in:active,on_leave,suspended,retired',
            'notes' => 'nullable|string',
            'user_id' => 'nullable|exists:users,id',
            'license_front_file' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',
            'license_back_file' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',
            'photo_file' => 'nullable|file|mimes:jpeg,png,jpg|max:10240',
        ]);

        $driver = Driver::create($validated);

        if ($request->hasFile('license_front_file')) {
            $driver->license_front = $request->file('license_front_file')->store('drivers/licenses', 'public');
        }
        if ($request->hasFile('license_back_file')) {
            $driver->license_back = $request->file('license_back_file')->store('drivers/licenses', 'public');
        }
        if ($request->hasFile('photo_file')) {
            $driver->photo = $request->file('photo_file')->store('drivers/photos', 'public');
        }
        $driver->save();

        if ($request->hasFile('attachments')) {
            $driver->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Driver added successfully', 'data' => $driver], 201);
    }

    public function show(Driver $driver)
    {
        $driver->load(['assignments.vehicle', 'fuelEntries', 'trips']);
        return response()->json($driver);
    }

    public function update(Request $request, Driver $driver)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string',
            'nic_number' => 'sometimes|required|unique:drivers,nic_number,'.$driver->id,
            'address' => 'nullable|string',
            'contact_number' => 'sometimes|required|string',
            'license_number' => 'sometimes|required|unique:drivers,license_number,'.$driver->id,
            'license_expiry_date' => 'sometimes|required|date',
            'photo' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string',
            'emergency_contact_phone' => 'nullable|string',
            'status' => 'sometimes|required|in:active,on_leave,suspended,retired',
            'notes' => 'nullable|string',
            'user_id' => 'nullable|exists:users,id',
            'license_front_file' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',
            'license_back_file' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',
            'photo_file' => 'nullable|file|mimes:jpeg,png,jpg|max:10240',
        ]);

        $driver->update($validated);

        if ($request->hasFile('license_front_file')) {
            $driver->license_front = $request->file('license_front_file')->store('drivers/licenses', 'public');
        }
        if ($request->hasFile('license_back_file')) {
            $driver->license_back = $request->file('license_back_file')->store('drivers/licenses', 'public');
        }
        if ($request->hasFile('photo_file')) {
            $driver->photo = $request->file('photo_file')->store('drivers/photos', 'public');
        }
        $driver->save();

        if ($request->hasFile('attachments')) {
            $driver->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Driver updated successfully', 'data' => $driver]);
    }

    public function destroy(Driver $driver)
    {
        $driver->delete();
        return response()->json(['message' => 'Driver deleted successfully']);
    }
}
