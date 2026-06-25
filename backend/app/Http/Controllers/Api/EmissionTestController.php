<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmissionTest;
use Illuminate\Http\Request;

class EmissionTestController extends Controller
{
    public function index(Request $request)
    {
        $query = EmissionTest::with(['vehicle:id,vehicle_number', 'attachments']);
        return response()->json($query->latest('test_date')->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'test_date' => 'required|date',
            'result' => 'required|in:pass,fail,pending',
            'expiry_date' => 'nullable|date|after:test_date',
            'test_center' => 'nullable|string',
            'certificate_number' => 'nullable|string',
            'notes' => 'nullable|string',
            'cost' => 'nullable|numeric',
        ]);
        $test = EmissionTest::create($validated);

        if ($request->hasFile('attachments')) {
            $test->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Test recorded', 'data' => $test], 201);
    }

    public function show(EmissionTest $emission_test)
    {
        $emission_test->load('vehicle');
        return response()->json($emission_test);
    }

    public function update(Request $request, EmissionTest $emissionTest)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'test_date' => 'sometimes|required|date',
            'result' => 'sometimes|required|in:pass,fail,pending',
            'expiry_date' => 'nullable|date',
            'test_center' => 'nullable|string',
            'certificate_number' => 'nullable|string',
            'notes' => 'nullable|string',
            'cost' => 'nullable|numeric',
        ]);
        $emissionTest->update($validated);

        if ($request->hasFile('attachments')) {
            $emissionTest->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Test updated', 'data' => $emissionTest]);
    }

    public function destroy(EmissionTest $emission_test)
    {
        $emission_test->delete();
        return response()->json(['message' => 'Emission test deleted']);
    }
}
